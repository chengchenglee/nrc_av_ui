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
    #if "ipod" in msg.payload: continue
    #print(msg.topic)
    payload = msg.payload.strip('\"')
    payload = payload.replace('\\n', '\n')
    #print(payload)
    if "heartbeat" in msg.topic:
      value = payload.split(',')[1]
      agentName = value
      newAgent = True
      for t in subscribedTopics:
        if agentName in t:
          newAgent = False
      if newAgent:
        topic = 'dt/'+agentName+'/status'
        print("New Subscription:",topic)
        newSubscriptions.append(topic)
    elif "status" in msg.topic:
      agentData = MonitoredAgent()
      agentData.parseMsgPayloadCsv(payload)
  
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
