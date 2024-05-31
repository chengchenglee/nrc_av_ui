#!/usr/bin/python

import rospy
import os
import signal # Catch ctrl-c
import sys
from RoscoreObj import *

import loader as Loader
import time

from nrc_msgs.msg import *  # InterventionRequest

running = True

def signal_handler(sig, frame):
  global running
  running = False
  print('Caught ctrl-c')
  
# Catch ctrl-c
signal.signal(signal.SIGINT, signal_handler)

text = []
with open('sim_config.yaml', 'r') as file:
  text = file.read()

printDebug = True
subsystems = Loader.read_subsystems(text, printDebug)

# Start roscore
if True:
  roscore = Roscore()
  roscore.run()
  rospy.init_node('listener', anonymous=True)

  # Subscribe health topics
  Loader.subscribe_health_msgs(subsystems)
  
  avStatusPub = rospy.Publisher("ailsv_av_status",InterventionRequest,queue_size=1)
  
  agent_name = 'Test1'
  map_name = 'Franklin.set'
  
  os.system("rosparam set /agent_name "+agent_name)
  os.system("rosrun nrc_svcs paramsForDriving.sh")
  os.system("rosrun nrc_svcs paramsForMap.sh "+map_name)
  
  Loader.launch_subsystems(subsystems)

  while running:    
    # Wait for updates
    time.sleep(0.5)
            
  # End rospy
  print("Closing interface monitor")
  #Loader.stop_subsystems(subsystems)
  roscore.terminate()
  sys.exit(0)
  
