#!/usr/bin/python

import os
import signal # Catch ctrl-c
import sys
from RoscoreObj import *

from avagent import AvAgent
from interface import Interface
import time
import numpy as np
from argparse import ArgumentParser
import rospkg

running = True

def signal_handler(sig, frame):
  global running
  running = False
  print('Caught ctrl-c')
  
# Catch ctrl-c
signal.signal(signal.SIGINT, signal_handler)

default_path = rospkg.RosPack().get_path('nrc_av_ui')+'/config/'
parser = ArgumentParser()
parser.add_argument("-c", "--config", dest='config',
                    default=default_path+str(os.environ.get('AGENT_CONFIG')), 
                    help="pass config file as argument. Default from environment variable AGENT_CONFIG")
parser.add_argument("-a", "--agent", dest='agent',
                    default=os.environ.get('AGENT_NAME'), 
                    help="pass agent name as argument. Default from environment variable AGENT_NAME")
parser.add_argument("-v", "--verbose",
                    type=bool, default=False, dest='verbose',
                    help="set True for verbose mode. Default set to false.")

args = parser.parse_args()
print('Starting AV Agent (name/config):',args.agent,args.config)

text = []

inclGui = True
agent_name = args.agent
agent_config = args.config
verbose = args.verbose


filename = 'sim_config.yaml'
agent = AvAgent(agent_config, agent_name, verbose)
if (agent.useGui == 1): interface = Interface(agent.name, agent.mapName)

# Start roscore
if True:
  roscore = Roscore()
  roscore.run()
  
  if (agent.useGui == 1): interface.setupWindow(agent)

  os.system("rosrun nrc_svcs paramsForDriving.sh")
  os.system("rosrun nrc_svcs paramsForMap.sh "+agent.mapName)
  os.system("rosparam set /robot_description -t "+rospkg.RosPack().get_path('nrc_av_ui')+'/calib/'+agent.agentUrdf+'.urdf')
  os.system("rosparam set /agent_name "+agent.name)
  os.system("rosparam set /agent_config "+agent_config)

  if agent.rosparams:
    for key, value in agent.rosparams.items():
      os.system("rosparam set "+key+" "+value)

  agent.pubSubSetup()

  nextPollTime = 0
  nextStSend = 0
  nextWmSend = 0
  nextSnapSend = time.time()+1
  debugTiming = False
  rndTripMsgTime = 0
  while running:
    # Wait for updates
    prevTime = time.time()
    dtStamps = np.zeros(4)
    if time.time() > nextPollTime:
      nextPollTime = time.time()+0.05
      agent.pollMonitors()
      agent.parseAgentMail()
      if (agent.useGui == 1):
        interface.updateSnpText(agent.fileInTransit)
        interface.update(agent.subsystems)
      dtStamps[0] = round((time.time() - prevTime)*1000)/1000
      if debugTiming: print('Poll Monitors/Mail',dtStamps[0])
      prevTime = time.time()

    if time.time() > nextStSend:
      nextStSend = time.time()+0.5
      if agent.cloud.isConnected == True:
        agent.sendStatusCsv()
      dtStamps[1] = round((time.time() - prevTime)*1000)/1000
      if debugTiming: print('Send status',dtStamps[1])
      prevTime = time.time()

    fullRateWm = agent.remoteMonTeleoping or agent.sendWm == 2
    lowRateWm  = agent.remoteWmDisplayOn
    minWaitTime = max(0.1, min(1.0,round(agent.avgRndTripMsgTime*100)/100))
    if time.time() > nextWmSend and (lowRateWm or fullRateWm):
      if fullRateWm:
        #if (minWaitTime>0.1): print('Delay sending wm due to network',minWaitTime)
        nextWmSend = time.time()+max(0.1,minWaitTime)
      else:
        nextWmSend = time.time()+max(0.5,minWaitTime)
        
      if agent.sendWm and agent.cloud.isConnected == True:
        agent.sendWmStatus()
        agent.passThroughWm  = True
        agent.passThroughImg = True
      dtStamps[2] = round((time.time() - prevTime)*1000)/1000
      if debugTiming: print('Send WM',dtStamps[2])
      prevTime = time.time()
    
    if (time.time() > nextSnapSend) and (not fullRateWm):
      nextSnapSend = time.time()+0.1
      if agent.cloud.dataInQueue == False and agent.cloud.isConnected == True:
        if (agent.sendSnapshots): agent.sendSnapshot()
      dtStamps[3] = round((time.time() - prevTime)*1000)/1000
      if debugTiming: print('Send Snapshot',dtStamps[3])
    
    tTotal = np.sum(dtStamps)
    if (agent.printTimeDebug == 1 and tTotal > 0.08) or (tTotal > 0.9):
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

