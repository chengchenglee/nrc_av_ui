#!/usr/bin/python3

# Monkey patch at the very beginning
import eventlet
eventlet.monkey_patch()

import os
import signal
import sys
import json
import time
from threading import Lock
import argparse
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit

# Set up paths
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
template_dir = os.path.join(current_dir, 'templates')
static_dir = os.path.join(current_dir, 'static')

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Initialize Flask with explicit template and static folders
app = Flask(__name__,
           template_folder=template_dir,
           static_folder=static_dir)

# Now import the modules
from av_ui.rAgent import *
from av_ui.include.cloud_connection import CloudConnection

# Configure Flask application
app.config.update(
    SECRET_KEY='secret!',
    APPLICATION_ROOT='/',
    DEBUG=True  # Set to True for development
)

# Initialize SocketIO with eventlet
socketio = SocketIO(
    app,
    async_mode='eventlet',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Thread management
thread = None
thread_lock = Lock()

# Global variables
running = True
cloud = None
monitoredAgents = []
newSubscriptions = ['dt/agents/heartbeat']
subscribedTopics = []

def background_thread():
    global monitoredAgents, newSubscriptions, cloud
    
    while running:
        # Update agent wmState subscriptions
        updateTeleopSubs()
        
        # Update agent status subscriptions
        updateStatusSubs()
        
        # Parse updates
        parseMsgs(cloud.getMail())
        
        # Emit data to connected clients
        agent_data = []
        for agent in monitoredAgents:
            agent_info = {
                'name': agent.name,
                'status': agent.heartbeat.toDict() if agent.heartbeat else None,
                'wmStatus': agent.wmStatus.toDict() if agent.wmStatus else None,
                'imgStreamData': agent.imgStreamData.toDict() if agent.imgStreamData else None
            }
            agent_data.append(agent_info)
        
        socketio.emit('status_update', {'agents': agent_data})
        socketio.sleep(0.1)

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def connect():
    global thread
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(background_thread)

@socketio.on('teleop_command')
def handle_teleop_command(data):
    global monitoredAgents, cloud
    agent_name = data.get('agent')
    command = data.get('command')
    
    for agent in monitoredAgents:
        if agent.name == agent_name:
            agent.teleopCmdData.fromDict(command)
            cloud.publishCsv(agent.teleopTopic, agent.getTeleopCmd(), 0)
            break

def parseMsgs(messages):
    global monitoredAgents, newSubscriptions
    for msg in messages:
        # Received heartbeat from an agent
        if "heartbeat" in msg['topic']:
            hb = HeartbeatData()
            hb.fromMsg(msg)
            agentName = hb.agentName.value

            newAgent = True
            for t in subscribedTopics:
                if agentName in t:
                    newAgent = False
                    break

            if newAgent:
                topic = 'dt/'+agentName+'/status'
                newSubscriptions.append(topic)
            else:
                for ma in monitoredAgents:
                    if agentName in ma.name:
                        ma.tLastMsg = time.time()
                        ma.agentMsgCount = hb.msgCount.value
                        ma.nextCmdMsgTime = time.time()

        # Received a status update from an agent
        elif "status" in msg['topic']:
            updatedAgentData = MonitoredAgent()
            updatedAgentData.parseMsgPayloadCsv(msg['data'])

            found = False
            for a in monitoredAgents:
                if a.name == updatedAgentData.name:
                    found = True
                    a.update(updatedAgentData)
            
            if not found:
                monitoredAgents.append(updatedAgentData)

        # Received a world model state from an agent
        elif "wmState" in msg['topic']:
            for a in monitoredAgents:
                if a.name in msg['topic']:
                    a.updateWmFromMqtt(msg['data'])
                    break

        elif "imgStream" in msg['topic']:
            for a in monitoredAgents:
                if a.name in msg['topic']:
                    a.updateImgFromMqtt(msg['data'])
                    break

def updateStatusSubs():
    global cloud, newSubscriptions, subscribedTopics
    for t in newSubscriptions:
        alreadySubscribed = False
        for ts in subscribedTopics:
            if t == ts:
                alreadySubscribed = True
        if not alreadySubscribed:
            qos = 0
            cloud.subscribe([t], qos)
            subscribedTopics.append(t)

def updateTeleopSubs():
    global cloud, subscribedTopics
    # Implementation similar to original but adapted for web interface
    pass

def init_cloud(broker):
    global cloud
    cloud = CloudConnection("RemoteMonitor", broker)
    cloud.init()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-b', '--broker', default='emqx')
    args = parser.parse_args()
    
    with app.app_context():
        init_cloud(args.broker)
        socketio.run(app, host='0.0.0.0', port=5000)