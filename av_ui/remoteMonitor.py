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

running = True
gui = Interface()
cloud = CloudConnection("RemoteMonitor")

monitoredAgents = []
newSubscriptions = ['dt/agents/heartbeat']
subscribedTopics = []

def parseMsgs(messages):
  global monitoredAgents, newSubscriptions
  for msg in messages:
    payloadStr = msg.payload.decode('utf-8')
    if "heartbeat" in msg.topic:
      value = payloadStr.split(',')[1]
      agentName = value
      newAgent = True
      for t in subscribedTopics:
        if agentName in t:
          newAgent = False
      if newAgent:
        topic = 'dt/'+agentName+'/status'
        newSubscriptions.append(topic)
      else:
        for a in monitoredAgents:
          if agentName in a.name:
            a.tLastMsg = time.time()
            
    elif "status" in msg.topic:
      agentData = MonitoredAgent()
      agentData.parseMsgPayloadCsv(payloadStr)
  
      found = False
      for a in monitoredAgents:
        if a.name == agentData.name:
          found = True
          a.update(agentData.subsystems)
      
      if not found:
        monitoredAgents.append(agentData)
        
    elif "wmState" in msg.topic:
      for a in monitoredAgents:
        if a.name in msg.topic:
          a.wmStatus.updateFromMqtt(payloadStr)
          break

def updateTeleopSubs():
  global gui, subscribedTopics
  
  newSubscribedTopics = []
  if gui.selectedAgent == 'None':
    for topic in subscribedTopics:
      if 'wmState' in topic:
        cloud.unsubscribe([topic])
      else:
        newSubscribedTopics.append(topic)
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

if True:
  gui.setupWindow()
  gui.initCanvas()
  cloud.init()
  
  nextUpdate = 0
  
  while running:
    # Check for new agents
    if time.time() > nextUpdate:
      nextUpdate = time.time()+0.2
      
      # Update cloud subscriptions for teleop frame
      updateTeleopSubs()
      
      for t in newSubscriptions:
        alreadySubscribed = False
        for ts in subscribedTopics:
          if t == ts: alreadySubscribed = True
        if not alreadySubscribed:
          cloud.subscribe([t])
          subscribedTopics.append(t)
      
      # Parse updates
      parseMsgs(cloud.getMail())
      gui.update(monitoredAgents)
      
      for ma in monitoredAgents:
        cloud.publishCsv(ma.cmdTopic, ma.getCmdData())

    if not gui.selectedAgent == 'None':
      for a in monitoredAgents:
        if a.name == gui.selectedAgent:
          gui.updateCanvas(a.wmStatus)
    
    time.sleep(0.05)

  # Close
  print("Closing Remote Monitor")
  sys.exit(0)
