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

  def pubSubSetup(self):
    rospy.init_node('listener', anonymous=True)  # AvAgent Node
    Loader.subscribe_health_msgs(self.subsystems)
    avStatusPub = rospy.Publisher("ailsv_av_status",InterventionRequest,queue_size=1)

  def setLaunchAll(self):
    self.launchAll = True

  def pollMonitors(self):
    # Check if subsystems need launching
    for s in self.subsystems:
      start = self.launchAll == True and s.status == 0 and s.timeStopped > 1

      dependenciesMet = True
      for sDepend in s.launchDepend:
        for sOther in self.subsystems:
          if (sDepend != '') and (sDepend in sOther.name) and (sOther.status < 3):
            dependenciesMet = False
      
      if dependenciesMet:
        if s.restartRequest and s.isStarted == 1:
          s.stop()
        
        elif s.restartRequest or start:
          s.start(s.restartRequest)
    
    # Update subsystem status
    for s in self.subsystems:
      s.updateStatus('Update')
