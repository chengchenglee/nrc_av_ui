#!/usr/bin/python

import rospy
from subsystem import Subsystem
import loader as Loader
from nrc_msgs.msg import *  # InterventionRequest

class AvAgent:
  def __init__(self, filename):
    self.name = "Default"
    self.mapName = "Franklin.set"
    self.subsystems = []
    
    # Load the agent configuration
    self.filename = filename
    agent_name = 'Test1'
    map_name = 'Franklin.set'
    
    with open(filename, 'r') as file:
      text = file.read()

    printDebug = False
    self.subsystems = Loader.read_subsystems(text, printDebug)
  
  def subscribe(self):
    rospy.init_node('listener', anonymous=True)  # AvAgent Node
    Loader.subscribe_health_msgs(self.subsystems)
    avStatusPub = rospy.Publisher("ailsv_av_status",InterventionRequest,queue_size=1)
    
  def launchAll(self):
    Loader.launch_subsystems(self.subsystems)
