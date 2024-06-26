#!/usr/bin/python

import os
import signal # Catch ctrl-c
import sys
import json, ast

from rAgent import *
from cloud_connection import CloudConnection
from collections import OrderedDict
from rInterface import Interface
from fileInTransit import FileInTransit
import time
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-b', '--broker', default='ncal')
args, uargs = parser.parse_known_args()

running = True
gui = Interface()
agentName = 'RemoteSnapshot'
cloud = CloudConnection(agentName,args.broker)

newSubscriptions = ['dt/agents/heartbeat']
subscribedTopics = []

snapshotStreams = {}

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
        print('Rx new agent heartbeat',agentName)
        topic = 'dt/'+agentName+'/snapshots'
        newSubscriptions.append(topic)
        
        todaysDate = ''.join(time.strftime("%Y-%m-%d"))
        pathToBags = '/opt/data/snapshots/'+agentName+'/'+todaysDate+'/'
        snapshotStreams[agentName] = FileInTransit(pathToBags)

    if "snapshots" in msg['topic']:
      print('Rx snapshot data',msg['topic'])
      agentName = msg['topic'].split('/')[1]
      [h,c] = snapshotStreams[agentName].splitPayload(msg['data'])
      if not h == 'Invalid Header':
        snapshotStreams[agentName].saveChunk(h,c)

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
  cloud.init()
  
  nextUpdate = 0
  nextHeartbeat = 0
  while running:
    # Update everything
    if time.time() > nextUpdate:
      nextUpdate = time.time()+0.2

      # Parse updates
      parseMsgs(cloud.getMail())
      updateStatusSubs()

    if time.time() > nextHeartbeat:
      topic = 'dt/remote_snapshot/heartbeat'
      data ='a,'+agentName
      cloud.publishCsv(topic,data)
      nextHeartbeat = time.time()+1

    time.sleep(0.05)

  # Close
  print("Closing Remote Monitor")
  sys.exit(0)
