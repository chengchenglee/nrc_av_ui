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
    if "heartbeat" in msg.topic:
      msgDict = ast.literal_eval(msg.payload)
      agentName = msgDict["agent"]
      newAgent = True
      for t in subscribedTopics:
        if agentName in t:
          newAgent = False
      if newAgent:
        newSubscriptions.append('dt/'+agentName+'/status')
    elif "status" in msg.topic:
      agentData = MonitoredAgent()
      agentData.parseMsgPayload(msg.payload)
  
      found = False
      for a in monitoredAgents:
        if a.name == agentData.name:
          found = True
          a.update(agentData.subsystems)
      
      if not found:
        monitoredAgents.append(agentData)

if True:
  gui.setupWindow()
  cloud.init()
  
  while running:
    # Check for new agents
    for t in newSubscriptions:
      alreadySubscribed = False
      for ts in subscribedTopics:
        if t == ts: alreadySubscribed = True
      if not alreadySubscribed:
        print "New subscription:",t
        cloud.subscribe([t])
        subscribedTopics.append(t)
    
    # Wait for updates
    parseMsgs(cloud.getMail())
    gui.update(monitoredAgents)
    for ma in monitoredAgents:
      cloud.publish(ma.cmdTopic, ma.getCmdData())
    time.sleep(0.2)

  # Close
  print("Closing Remote Monitor")
  sys.exit(0)
