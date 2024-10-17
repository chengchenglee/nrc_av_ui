#!/usr/bin/python

import os
import signal # Catch ctrl-c
import sys
import json, ast
from collections import OrderedDict
import time
import argparse

from rAgent import *
from include.cloud_connection import CloudConnection
from rInterface import Interface

parser = argparse.ArgumentParser()
parser.add_argument('-b', '--broker', default='emqx')
args, uargs = parser.parse_known_args()

running = True
gui = Interface()
cloud = CloudConnection("RemoteMonitor",args.broker)

monitoredAgents = []
newSubscriptions = ['dt/agents/heartbeat']
subscribedTopics = []

def parseMsgs(messages):
  global monitoredAgents, newSubscriptions
  for msg in messages:
    
    # Received heartbeat from an agent
    if "heartbeat" in msg['topic']:
      # Get agent name from message and see if we're already monitoring it
      hb = HeartbeatData()
      hb.fromMsg(msg)
      agentName = hb.agentName.value

      newAgent = True
      for t in subscribedTopics:
        if agentName in t:
          newAgent = False  
          break  
      # If new agent, subscribe.  If not, update time stamp
      if newAgent == True:
        topic = 'dt/'+agentName+'/status'
        newSubscriptions.append(topic)
      else:
        for a in monitoredAgents:
          if agentName in a.name:
            a.tLastMsg = time.time()
            a.agentMsgCount = hb.msgCount.value
            
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

# Only subscribe to agent wmState if we've selected them on teleop tab
def updateTeleopSubs():
  global cloud, gui, subscribedTopics
  
  # If teleop tab has no agent selected, unsubscribe from all wmState topics
  # We rebuild the list of subscribed topics because python
  newSubscribedTopics = []
  
  # Remove wm and img stream topics
  if gui.selectedAgent == 'None':
    for topic in subscribedTopics:
      if 'wmState' in topic:
        cloud.unsubscribe([topic])
      elif 'imgStream' in topic:
        cloud.unsubscribe([topic])
      else:
        newSubscribedTopics.append(topic)
  
  # Add wm and img stream topics
  else:
    foundSub = False
    for topic in subscribedTopics:
      
      # Found a wm/img subscription
      if ('wmState' in topic) or ('imgStream' in topic):
        
        # ... it is the one we want to monitor
        if gui.selectedAgent in topic:
          foundSub = True
          
        # ... but it's not the vehicle we want to monitor
        else:
          cloud.unsubscribe([topic])
          
      # Not a wm/img topic, so want to keep
      else:
        newSubscribedTopics.append(topic)
    
    wmTopics = ['dt/'+gui.selectedAgent+'/wmState','dt/'+gui.selectedAgent+'/imgStream']
    for wmTopic in wmTopics:
      if not foundSub:
        qos = 0
        cloud.subscribe([wmTopic],qos)
      newSubscribedTopics.append(wmTopic)
  
  subscribedTopics = newSubscribedTopics[:]

def updateStatusSubs():
  global cloud, newSubscriptions, subscribedTopics
  for t in newSubscriptions:
    alreadySubscribed = False
    for ts in subscribedTopics:
      if t == ts:
        alreadySubscribed = True
    if not alreadySubscribed:
      qos = 0
      cloud.subscribe([t],qos)
      subscribedTopics.append(t)

if True:
  gui.setupWindow()
  gui.initCanvas()
  cloud.init()
  
  updateSubs = 0
  updatePubs = 0
  updateTeleopCmd = 0
  while running:
    # Update everything
    if time.time() > updateSubs:
      updateSubs = time.time()+0.05
      
      # Update agent wmState subscriptions
      updateTeleopSubs()
      
      # Update agent status subscriptions
      updateStatusSubs()
      
      # Parse updates
      parseMsgs(cloud.getMail())
      gui.update(monitoredAgents)
      
      # Only update the teleop canvas if we've selected an agent
      isTeleopTab = gui.tab_control.tab(gui.tab_control.select(),"text") == 'Teleop'
      for ma in monitoredAgents:
        if isTeleopTab and ma.name == gui.selectedAgent:
          ma.wmDisplayOn = 1
          ma.teleopOn = gui.isTeleop
          kbitsPerSecIn = cloud.msgInStats.kbitsPerSec
          gui.updateCanvas(ma.wmStatus,ma.imgStreamData,ma.stateMsgCount,kbitsPerSecIn)
        else:
          ma.wmDisplayOn = 0
          ma.teleopOn = 0
          ma.teleopCmdData.commands = []
      if not isTeleopTab:
        gui.teleopCmds = []
        gui.isTeleop = 0
    
    if time.time() > updateTeleopCmd:
      updateTeleopCmd = time.time() + 0.1
      
      # Publish commands
      isTeleopTab = gui.tab_control.tab(gui.tab_control.select(),"text") == 'Teleop'
      for ma in monitoredAgents:
        if isTeleopTab and ma.name == gui.selectedAgent:
          gui.transferTeleopCmds(ma)
          qos=0
          cloud.publishCsv(ma.teleopTopic, ma.getTeleopCmd(),qos)
    
    if time.time() > updatePubs:
      updatePubs = time.time() + 1.0

      # Publish commands
      for ma in monitoredAgents:
        qos=0
        cloud.publishCsv(ma.cmdTopic, ma.getCmdData(),qos)
        
        if False:
          waypoints = []
          waypoints.append([0,1,2])
          waypoints.append([3,4,5])
          waypoints.append([6,7,8])
          
          waypointsMsg = WaypointData(waypoints)
          qos = 1
          topic = "wyp/"+ma.name+"/remote"
          csvStr = waypointsMsg.toMsg()
          cloud.publishCsv(topic,csvStr,qos)
          print('Publish waypoints...'+topic)

    time.sleep(0.01)

  # Close
  print("Closing Remote Monitor")
  sys.exit(0)
