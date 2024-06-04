#!/usr/bin/python

import rospy
from subsystem import Subsystem
import loader as Loader
from nrc_msgs.msg import *  # InterventionRequest

class AvAgent:
  def __init__(self, filename):
    self.filename = filename
    self.name = "Default"
    self.mapName = "Franklin.set"
    self.subsystems = []
    self.launchAll = False
    
    # Load the agent configuration
    
    with open(filename, 'r') as file:
      text = file.read()

    printDebug = False
    self.subsystems = Loader.read_subsystems(text, printDebug)
  
  def subscribe(self):
    rospy.init_node('listener', anonymous=True)  # AvAgent Node
    Loader.subscribe_health_msgs(self.subsystems)
    avStatusPub = rospy.Publisher("ailsv_av_status",InterventionRequest,queue_size=1)
    
  def setLaunchAll(self):
    print("Launch all!!")
    self.launchAll = True

  def pollMonitors(self):
    if self.launchAll == True:
      for s in self.subsystems:
        if s.status == 0:
          readyToLaunch = True
          
          for sDepend in s.launchDepend:
            for sOther in self.subsystems:
              if (sDepend != '') and (sDepend in sOther.name) and (sOther.status < 3):
                #print("Launch depend:",s.name,sOther.name,sOther.status)
                readyToLaunch = False
          
          #print("Launch:",s.name,readyToLaunch)
          if readyToLaunch == True:
            s.start()
    
    
    for s in self.subsystems:
      s.updateStatus('Update')
