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
filename = 'sim_config.yaml'
agent = AvAgent(filename)
interface = Interface(agent.name)

# Start roscore
if True:
  roscore = Roscore()
  roscore.run()
  time.sleep(0.5)
  
  interface.setupWindow(agent.subsystems)

  os.system("rosparam set /agent_name "+agent.name)
  os.system("rosrun nrc_svcs paramsForDriving.sh")
  os.system("rosrun nrc_svcs paramsForMap.sh "+agent.mapName)
  
  agent.subscribe()  
    #agent.launchAll()

  while running:    
    # Wait for updates
    agent.pollMonitors()
    interface.update(agent.subsystems)
    
    time.sleep(0.1)
            
  # End rospy
  print("Closing interface monitor")
  roscore.terminate()
  sys.exit(0)
  
