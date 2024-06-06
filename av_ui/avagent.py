#!/usr/bin/python

from os.path import expanduser
import rospy
from subsystem import Subsystem
import loader as Loader
from nrc_msgs.msg import InterventionRequest
from std_msgs.msg import Int16MultiArray
import numpy as np

class AvAgent:
  def __init__(self, agent_type, agent_name):
    self.name = agent_name
    home = expanduser("~")
    self.filename = home+"/projects/nrc_ws/src/nrc_av_ui/av_ui/"+agent_type
    self.mapName = "Franklin.set"
    self.subsystems = []
    self.avStatusPub = []
    self.avLedStatusPub = []

    # Load the agent configuration
    with open(self.filename, 'r') as file:
      text = file.read()
    printDebug = False
    self.subsystems = Loader.read_subsystems(text, printDebug)
    self.mapName = Loader.getMapName(text)

  def pubSubSetup(self):
    rospy.init_node('listener', anonymous=True)  # AvAgent Node
    Loader.subscribe_health_msgs(self.subsystems)
    self.avStatusPub = rospy.Publisher("ailsv_av_status",InterventionRequest,queue_size=1)
    self.avLedStatusPub = rospy.Publisher("ailsv_av_led",Int16MultiArray,queue_size=1)

  def setLaunchAll(self):
    for s in self.subsystems:
      if s.trigger == 'Startup' or s.trigger == 'StartRequest' or s.trigger == 'PMU':
        s.shouldBeStarted = max(1, s.shouldBeStarted)

  def pollMonitors(self):
    # Check if subsystems need launching
    for s in self.subsystems:
      if s.shouldBeStarted > 0:
        readyToStart = s.status == 0 and s.timeStopped > 1

        dependenciesMet = True
        for sDepend in s.launchDepend:
          for sOther in self.subsystems:
            if (sDepend != '') and (sDepend in sOther.name) and ((not sOther.readyToMonitor) or (sOther.status < 3)):
              dependenciesMet = False
        
        # Dependencies met
        if dependenciesMet:
          if s.restartRequest and s.isStarted == 1:
            s.stop()
          
          elif readyToStart:
            s.start(s.restartRequest)
      else:
        if s.isStarted == True:
          s.stop()

    # Update subsystem status
    ledStatus = [0,0,0,0,0,0,0,0] 
    for s in self.subsystems:
      sStatus = s.updateStatus('Update')
      
    for i in range(0:7):
      sStatus[i] = max(sStatus[i], ledStatus)
      
    avStatusLedMsg = Int16MultiArray()
    avStatusLedMsg.layout.data_offset = 8
    avStatusLedMsg.data = ledStatus
      
      
