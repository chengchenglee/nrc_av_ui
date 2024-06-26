#!/usr/bin/python

import os
import signal # Catch ctrl-c
import sys
from RoscoreObj import *

from avagent import AvAgent
from interface import Interface
import time
import numpy as np

running = True

def signal_handler(sig, frame):
  global running
  running = False
  print('Caught ctrl-c')
  
# Catch ctrl-c
signal.signal(signal.SIGINT, signal_handler)

text = []

inclGui = True
agent_name = os.environ['AGENT_NAME']
agent_type = os.environ['AGENT_CONFIG']

filename = 'sim_config.yaml'
agent = AvAgent(agent_type, agent_name)
if (agent.useGui == 1): interface = Interface(agent.name, agent.mapName)

# Start roscore
if True:
  roscore = Roscore()
  roscore.run()
  
  if (agent.useGui == 1): interface.setupWindow(agent)

  os.system("rosparam set /agent_name "+agent.name)
  os.system("rosrun nrc_svcs paramsForDriving.sh")
  os.system("rosrun nrc_svcs paramsForMap.sh "+agent.mapName)
  
  agent.pubSubSetup()

  nextPollTime = 0
  nextStSend = 0
  nextWmSend = 0
  nextSnapSend = time.time()+1
  while running:
    # Wait for updates
    prevTime = time.time()
    dtStamps = np.zeros(4)
    if time.time() > nextPollTime:
      nextPollTime = time.time()+0.1
      agent.pollMonitors()
      agent.parseAgentMail()
      if (agent.useGui == 1): interface.update(agent.subsystems)
      dtStamps[0] = round((time.time() - prevTime)*1000)/1000
      prevTime = time.time()

    if time.time() > nextStSend:
      nextStSend = time.time()+0.1
      agent.sendStatusCsv()
      dtStamps[1] = round((time.time() - prevTime)*1000)/1000
      prevTime = time.time()

    remoteWmReq = agent.remoteWmDisplayOn == 1
    remoteWmReq = remoteWmReq or (time.time()-agent.remoteWmDisplayLastReq < 3.0)
    if time.time() > nextWmSend and (remoteWmReq or agent.sendWm == 2):
      nextWmSend = time.time()+0.1
      if (agent.sendWm > 0): agent.sendWmStatus()
      dtStamps[2] = round((time.time() - prevTime)*1000)/1000
      prevTime = time.time()
    
    if (time.time() > nextSnapSend) and (not remoteWmReq):
      nextSnapSend = time.time()+0.1
      if (agent.sendSnapshots): agent.sendSnapshot()
      dtStamps[3] = round((time.time() - prevTime)*1000)/1000
    
    tTotal = np.sum(dtStamps)
    if (agent.printTimeDebug == 1 and tTotal > 0.08) or (tTotal > 0.25):
      print('[Poll/SendSt/SendW/SendSn]',dtStamps,'====>',str(round(tTotal*1000)/1000))
      
    time.sleep(0.01)

  # End rospy
  print("Closing interface monitor")
  roscore.terminate()
  sys.exit(0)
  
  # Cleanup
  time.sleep(0.5)
  os.system("pkill -f nrc_ws")
  os.system("pkill -f ros")

