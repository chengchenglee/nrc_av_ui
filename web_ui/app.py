#!/usr/bin/python3

import eventlet
eventlet.monkey_patch()

import os
import sys
import time
import base64
import argparse
import json
from threading import Lock
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

# Set up paths
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import required modules
from av_ui.rAgent import *
from av_ui.include.cloud_connection import CloudConnection

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'remote-monitor-secret'

# Initialize SocketIO
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins='*', logger=False)

# Global variables
thread = None
thread_lock = Lock()
running = True
cloud = None
monitoredAgents = []
newSubscriptions = ['dt/agents/heartbeat']
subscribedTopics = []

# Update frequency control
BACKGROUND_UPDATE_INTERVAL = 0.5  # Update every 500ms
FRONTEND_UPDATE_INTERVAL = 1.0    # Send to frontend every 1s
last_frontend_update = 0

def background_thread():
    """Background thread that handles MQTT communication and periodic updates"""
    global monitoredAgents, newSubscriptions, cloud, last_frontend_update
    
    while running:
        try:
            # Update subscriptions
            updateStatusSubs()
            
            # Parse incoming messages
            messages = cloud.getMail()
            if messages:
                parseMsgs(messages)
            
            # Periodic command publishing (same as desktop app)
            for agent in monitoredAgents:
                if time.time() > getattr(agent, 'nextCmdMsgTime', 0):
                    agent.nextCmdMsgTime = time.time() + 1.5
                    if hasattr(agent, 'cmdTopic') and agent.cmdTopic:
                        try:
                            cloud.publishCsv(agent.cmdTopic, agent.getCmdData(), 0)
                        except Exception as e:
                            print(f"Error publishing cmd for {agent.name}: {e}")
            
            # Send updates to frontend at controlled rate
            current_time = time.time()
            if current_time - last_frontend_update >= FRONTEND_UPDATE_INTERVAL:
                last_frontend_update = current_time
                send_status_update()
                
        except Exception as e:
            print(f"Background thread error: {e}")
        
        socketio.sleep(BACKGROUND_UPDATE_INTERVAL)

def send_status_update():
    """Send current status to all connected clients"""
    agent_data = []
    for agent in monitoredAgents:
        try:
            # Basic agent info
            agent_info = {
                'name': agent.name,
                'selected': getattr(agent, 'selected', False),
                'cmdsMode': getattr(agent, 'cmdsMode', 'Sync'),
                'lastUpdate': time.time()
            }
            
            # Subsystems info
            subsystems = []
            for subsystem in getattr(agent, 'subsystems', []):
                sub_info = {
                    'name': subsystem.name,
                    'isRunning': getattr(subsystem, 'isRunning', 0),
                    'monitorCount': len(getattr(subsystem, 'monitors', []))
                }
                subsystems.append(sub_info)
            agent_info['subsystems'] = subsystems
            
            # World model status (for teleop)
            if hasattr(agent, 'wmStatus'):
                try:
                    agent_info['wmStatus'] = agent.wmStatus.toDict()
                except:
                    agent_info['wmStatus'] = None
            
            agent_data.append(agent_info)
            
        except Exception as e:
            print(f"Error serializing agent {getattr(agent, 'name', 'unknown')}: {e}")
    
    socketio.emit('status_update', {'agents': agent_data})

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def on_connect():
    global thread
    print("Client connected")
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(background_thread)

@socketio.on('disconnect')
def on_disconnect():
    print("Client disconnected")

@socketio.on('agent_select')
def handle_agent_select(data):
    """Handle agent selection"""
    agent_name = data.get('agent')
    for agent in monitoredAgents:
        if agent.name == agent_name:
            try:
                agent.select()
                # Immediate command publish
                if hasattr(agent, 'cmdTopic') and agent.cmdTopic:
                    cloud.publishCsv(agent.cmdTopic, agent.getCmdData(), 0)
                print(f"Agent {agent_name} selected: {agent.selected}")
                return {'success': True, 'selected': agent.selected}
            except Exception as e:
                print(f"Error selecting agent {agent_name}: {e}")
                return {'success': False, 'error': str(e)}
    return {'success': False, 'error': 'Agent not found'}

@socketio.on('agent_set_cmds')
def handle_agent_set_cmds(data):
    """Handle agent cmds mode toggle"""
    agent_name = data.get('agent')
    for agent in monitoredAgents:
        if agent.name == agent_name:
            try:
                agent.setCmds()
                # Immediate command publish
                if hasattr(agent, 'cmdTopic') and agent.cmdTopic:
                    cloud.publishCsv(agent.cmdTopic, agent.getCmdData(), 0)
                print(f"Agent {agent_name} cmdsMode: {agent.cmdsMode}")
                return {'success': True, 'cmdsMode': agent.cmdsMode}
            except Exception as e:
                print(f"Error setting cmds for agent {agent_name}: {e}")
                return {'success': False, 'error': str(e)}
    return {'success': False, 'error': 'Agent not found'}

@socketio.on('subsystem_toggle')
def handle_subsystem_toggle(data):
    """Handle subsystem start/stop toggle"""
    agent_name = data.get('agent')
    subsystem_name = data.get('subsystem')
    
    for agent in monitoredAgents:
        if agent.name == agent_name:
            for subsystem in getattr(agent, 'subsystems', []):
                if subsystem.name == subsystem_name:
                    try:
                        old_state = subsystem.isRunning
                        subsystem.stop()  # This toggles isRunning
                        new_state = subsystem.isRunning
                        
                        # Immediate command publish
                        if hasattr(agent, 'cmdTopic') and agent.cmdTopic:
                            cloud.publishCsv(agent.cmdTopic, agent.getCmdData(), 0)
                        
                        print(f"Subsystem {subsystem_name} toggled: {old_state} -> {new_state}")
                        return {'success': True, 'isRunning': new_state}
                    except Exception as e:
                        print(f"Error toggling subsystem {subsystem_name}: {e}")
                        return {'success': False, 'error': str(e)}
    return {'success': False, 'error': 'Subsystem not found'}

def parseMsgs(messages):
    """Parse incoming MQTT messages"""
    global monitoredAgents, newSubscriptions
    for msg in messages:
        try:
            if "heartbeat" in msg['topic']:
                # Handle heartbeat
                hb = HeartbeatData()
                hb.fromMsg(msg)
                agentName = hb.agentName.value

                # Check if new agent
                newAgent = True
                for t in subscribedTopics:
                    if agentName in t:
                        newAgent = False
                        break

                if newAgent:
                    topic = 'dt/' + agentName + '/status'
                    newSubscriptions.append(topic)
                else:
                    # Update existing agent timestamp
                    for ma in monitoredAgents:
                        if agentName in ma.name:
                            ma.tLastMsg = time.time()
                            ma.agentMsgCount = hb.msgCount.value
                            ma.nextCmdMsgTime = time.time()

            elif "status" in msg['topic']:
                # Handle status update
                updatedAgentData = MonitoredAgent()
                updatedAgentData.parseMsgPayloadCsv(msg['data'])

                found = False
                for agent in monitoredAgents:
                    if agent.name == updatedAgentData.name:
                        found = True
                        agent.update(updatedAgentData)

                if not found:
                    monitoredAgents.append(updatedAgentData)

        except Exception as e:
            print(f"Error parsing message {msg.get('topic', 'unknown')}: {e}")

def updateStatusSubs():
    """Update status subscriptions"""
    global cloud, newSubscriptions, subscribedTopics
    for topic in newSubscriptions:
        if topic not in subscribedTopics:
            try:
                cloud.subscribe([topic], 0)
                subscribedTopics.append(topic)
                print(f"Subscribed to: {topic}")
            except Exception as e:
                print(f"Error subscribing to {topic}: {e}")
    newSubscriptions.clear()

def init_app(broker):
    """Initialize the application"""
    global cloud
    cloud = CloudConnection("WebRemoteMonitor", broker)
    cloud.init()
    print(f"Connected to broker: {broker}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-b', '--broker', default='emqx', help='MQTT broker name')
    args = parser.parse_args()
    
    init_app(args.broker)
    print("Starting web remote monitor...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)