#!/usr/bin/python

from os.path import expanduser
import rospy
from subsystem import Subsystem
import loader as Loader
from nrc_msgs.msg import InterventionRequest
from std_msgs.msg import Int16MultiArray
import numpy as np
import time
from cloud_connection import CloudConnection
import json, ast
from collections import OrderedDict

class AvAgent:
  def __init__(self, agent_type, agent_name):
    self.name = agent_name
    home = expanduser("~")
    self.filename = home+"/projects/nrc_ws/src/nrc_av_ui/av_ui/"+agent_type
    self.mapName = "Franklin.set"
    self.subsystems = []
    self.avStatusPub = []
    self.avLedStatusPub = []
    self.pmuAvIdx = 3
    self.pmuAvReqHist = 'None'
    self.pmuState = [0,0,0,0,0,0,0,0]
    self.ardState = [0,0,0,0,0,0,0,0]

    # Load the agent configuration
    with open(self.filename, 'r') as file:
      text = file.read()
    printDebug = False
    self.subsystems = Loader.read_subsystems(text, printDebug)
    self.mapName = Loader.getMapName(text)
    
    self.cloud = CloudConnection(self.name,self.name)

  def pubSubSetup(self):
    rospy.init_node('listener', anonymous=True)  # AvAgent Node
    Loader.subscribe_health_msgs(self.subsystems)
    self.avStatusPub = rospy.Publisher("ailsv_av_status",InterventionRequest,queue_size=1)
    self.avLedStatusPub = rospy.Publisher("ailsv_av_led",Int16MultiArray,queue_size=1)
    
    self.cloud.init()
    self.cloud.subscribe(['cmd/'+self.name+'/remote'])
    
  def sendStatus(self):
    data = OrderedDict()
    data["agent"] = self.name
    sData = OrderedDict()
    for s in self.subsystems:
      mData = {}
      for m in s.monitors:
        mData[m.name] = m.status
      sData[s.name] = mData
    data["subs"] = sData
    
    topic = "dt/"+self.name+"/status"
    self.cloud.publish(topic,data)
    
    # Publish heartbeat
    heartbeat = { "agent": self.name }
    topic = "dt/agents/heartbeat"
    self.cloud.publish(topic,heartbeat)
    
  def getCmds(self):
    msgs = self.cloud.getMail()
    for m in msgs:
      msgJson = json.loads(m.payload,object_pairs_hook=OrderedDict)
      subsList = list(msgJson.keys())
      for sCmd in subsList:
        cmd = msgJson[sCmd]
        for s in self.subsystems:
          if s.name == sCmd and (cmd == 0 or cmd == 1):
            if s.shouldBeStarted != cmd:
              print("Remote cmd:",s.name, msgJson[sCmd])
              s.shouldBeStarted = cmd

  def setLaunchAll(self):
    for s in self.subsystems:
      if s.trigger == 'Startup' or s.trigger == 'StartRequest' or s.trigger == 'PMU':
        s.shouldBeStarted = max(1, s.shouldBeStarted)
        
  def setStopRequested(self):
    for s in self.subsystems:
      if s.trigger == 'StartRequest' or s.trigger == 'PMU' or s.trigger == 'ARD':
        s.shouldBeStarted = 0

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
    ledVec = [0,0,0,0,0,0,0,0]
    for s in self.subsystems:
      sLedVec = s.updateStatus('Update')
      if s.name == 'CAR':
        if s.pmuData[self.pmuAvIdx] == 2 and self.pmuState[self.pmuAvIdx] == 1:
          print('PMU Start Request!')
          self.pmuAvReqHist = 'Started'
          self.setLaunchAll()
          
        if s.pmuData[self.pmuAvIdx] == 1 and self.pmuState[self.pmuAvIdx] == 2 and self.pmuAvReqHist == 'Started':
          print('PMU Stop Request!')
          self.pmuAvReqHist = 'None'
          self.setStopRequested()
          
        self.pmuState = s.pmuData[:]
        self.ardState = s.ardData[:]
      
      if s.trigger == 'ARD' and s.triggerBit != -1 and s.triggerBit < len(self.ardState):
          #print("check trigger",s.triggerBit,self.ardState, len(self.ardState))
          if s.isStarted == 0 and self.ardState[s.triggerBit] > 0:
            s.reqStart()
          elif s.isStarted == 1 and self.ardState[s.triggerBit] == 0:
            s.reqStop()
      
      for i in range(0,8,1):
        ledVec[i] = max(sLedVec[i], ledVec[i])
      
    avStatusLedMsg = Int16MultiArray()
    avStatusLedMsg.layout.data_offset = 8
    avStatusLedMsg.data = ledVec
    self.avLedStatusPub.publish(avStatusLedMsg)
