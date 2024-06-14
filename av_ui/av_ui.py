#!/usr/bin/python

import os
import signal # Catch ctrl-c
import sys
from RoscoreObj import *

from avagent import AvAgent
from interface import Interface
import time

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

  while running:
    # Wait for updates
    agent.pollMonitors()
    if (agent.useGui == 1): interface.update(agent.subsystems)
    #agent.sendStatus()
    agent.sentStatusCsv()
    agent.getCmds()
    time.sleep(0.25)

  # End rospy
  print("Closing interface monitor")
  roscore.terminate()
  sys.exit(0)
  
  # Cleanup
  time.sleep(0.5)
  os.system("pkill -f nrc_ws")
  os.system("pkill -f ros")

