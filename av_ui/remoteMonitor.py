#!/usr/bin/python

import os
import signal # Catch ctrl-c
import sys
import json, ast

from rAgent import *
from cloud_connection import CloudConnection
from collections import OrderedDict
from rInterface import Interface
import time
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-b', '--broker', default='ncal')
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
      agentName = msg['data'][0][1]
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
            
    # Received a status update from an agent
    elif "status" in msg['topic']:
      agentData = MonitoredAgent()
      agentData.parseMsgPayloadCsv(msg['data'])
  
      found = False
      for a in monitoredAgents:
        if a.name == agentData.name:
          found = True
          a.update(agentData.subsystems)
      
      if not found:
        monitoredAgents.append(agentData)
        
    # Received a world model state from an agent
    elif "wmState" in msg['topic']:
      for a in monitoredAgents:
        if a.name in msg['topic']:
          a.wmStatus.updateFromMqtt(msg['data'])
          break

# Only subscribe to agent wmState if we've selected them on teleop tab
def updateTeleopSubs():
  global cloud, gui, subscribedTopics
  
  # If teleop tab has no agent selected, unsubscribe from all wmState topics
  newSubscribedTopics = []
  if gui.selectedAgent == 'None':
    for topic in subscribedTopics:
      if 'wmState' in topic:
        cloud.unsubscribe([topic])
      else:
        newSubscribedTopics.append(topic)
  
  # Subscribe to the relevant wmState topics
  else:
    foundSub = False
    for topic in subscribedTopics:
      if 'wmState' in topic:
        if gui.selectedAgent in topic:
          foundSub = True
        else:
          cloud.unsubscribe([topic])
      else:
        newSubscribedTopics.append(topic)
    
    topic = 'dt/'+gui.selectedAgent+'/wmState'
    if not foundSub:
      cloud.subscribe([topic])
    newSubscribedTopics.append(topic)
  
  subscribedTopics = newSubscribedTopics[:]

def updateStatusSubs():
  global cloud, newSubscriptions, subscribedTopics
  for t in newSubscriptions:
    alreadySubscribed = False
    for ts in subscribedTopics:
      if t == ts:
        alreadySubscribed = True
    if not alreadySubscribed:
      cloud.subscribe([t])
      subscribedTopics.append(t)

if True:
  gui.setupWindow()
  gui.initCanvas()
  cloud.init()
  
  updateSubs = 0
  updatePubs = 0
  while running:
    # Update everything
    if time.time() > updateSubs:
      nextUpdate = time.time()+0.05
      
      # Update agent wmState subscriptions
      updateTeleopSubs()
      
      # Update agent status subscriptions
      updateStatusSubs()
      
      # Parse updates
      parseMsgs(cloud.getMail())
      gui.update(monitoredAgents)
      
      # Only update the teleop canvas if we've selected an agent
      isTeleopTab = gui.tab_control.tab(gui.tab_control.select(),"text") == 'Teleop'
      if (not gui.selectedAgent == 'None') and isTeleopTab:
        for a in monitoredAgents:
          if a.name == gui.selectedAgent:
            a.wmDisplayOn = 1
            gui.updateCanvas(a.wmStatus)
    
    if time.time() > updatePubs:
      updatePubs = time.time() + 1.0

      # Publish commands
      for ma in monitoredAgents:
        qos=0
        cloud.publishCsv(ma.cmdTopic, ma.getCmdData(),qos)

    time.sleep(0.01)

  # Close
  print("Closing Remote Monitor")
  sys.exit(0)
