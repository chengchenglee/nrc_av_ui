#!/usr/bin/python

from os.path import expanduser
import os
import glob
import rospy
from subsystem import Subsystem
from wmStatus import WmStatus
from fileInTransit import FileInTransit
import loader as Loader
from nrc_msgs.msg import InterventionRequest
from std_msgs.msg import Int16MultiArray
from nrc_msgs.msg import TrackedObjectSet
import numpy as np
import time
from cloud_connection import CloudConnection
import json, ast
from collections import OrderedDict
import rospkg

class AvAgent:
  def __init__(self, agent_type, agent_name):
    self.name = agent_name
    home = expanduser("~")
    self.filename = rospkg.RosPack().get_path('nrc_av_ui')+'/config/'+agent_type
    self.mapName = "Franklin.set"
    self.subsystems = []
    self.avLedStatusPub = []
    self.pmuAvIdx = 3
    self.pmuAvReqHist = 'None'
    self.pmuState = [0,0,0,0,0,0,0,0]
    self.ardState = [0,0,0,0,0,0,0,0]
    self.wmStatus = WmStatus()

    # Load the agent configuration
    with open(self.filename, 'r') as file:
      text = file.read()
    printDebug = False
    self.subsystems = Loader.read_subsystems(text, printDebug)
    self.mapName = Loader.getField(text,'mapName','Franklin.set')
    self.useGui  = int(Loader.getField(text,'useGui',1))
    self.sendWm  = int(Loader.getField(text,'sendWm',0))
    self.sendSnapshots  = int(Loader.getField(text,'sendSnapshots',0))
    self.broker = Loader.getField(text, 'broker', 'ncal')
    print ("useGui: "+str(self.useGui))
    print ("sendWm: "+str(self.sendWm))
    print ("sendSnapshots: "+str(self.sendSnapshots))
    print ("broker: "+str(self.broker))
    self.printTimeDebug = int(Loader.getField(text,'printTimeDebug',0))
    
    # Prepare cloud connection
    self.cloud = CloudConnection(self.name, self.broker)
    self.cloud.updateConfig(text)
    
    # Prepare variables for uploading snapshots
    self.lastSnapshotRepoMsg = 0
    self.numSnapshotRepoMsgs = 0
    todaysDate = ''.join(time.strftime("%Y-%m-%d"))
    self.pathToBags = '/opt/data/snapshots/'+todaysDate+'/'
    self.fileInTransit = FileInTransit(self.pathToBags)

  def pubSubSetup(self):
    # Setup ros publishers and subscribers
    rospy.init_node('listener', anonymous=True)  # AvAgent Node
    Loader.subscribe_health_msgs(self.subsystems)
    self.avLedStatusPub = rospy.Publisher("ailsv_av_led",Int16MultiArray,queue_size=1)
    if self.sendWm == 1: 
      self.wmStatusSub = rospy.Subscriber("pc_processor/multi_object_tracker/tracked_object_set", TrackedObjectSet, self.wmStatus.updateObjs, queue_size = 1)
    
    # Setup mqtt publishers and subscribers
    self.cloud.init()
    self.cloud.subscribe(['cmd/'+self.name+'/remote'])
    self.cloud.subscribe(['dt/remote_snapshot/heartbeat'])
    
  def sendStatusCsv(self):
    # Heartbeat message
    topic = "dt/agents/heartbeat"
    data = ''
    data +='a,'+self.name
    self.cloud.publishCsv(topic,data)
    
    # Subsystem status
    topic = "dt/"+self.name+"/status"
    data = ''
    data = 'a,'+self.name+'\n'
    for s in self.subsystems:
      data += 's,'+s.name+'\n'
      for m in s.monitors:
        data += 'm,'+m.name+','+m.statusStr+'\n'
    self.cloud.publishCsv(topic,data)
  
  def sendWmStatus(self):
    # Send world model status (ego + other positions)
    topic = 'dt/'+self.name+'/wmState'
    payload = ''
    payload += self.wmStatus.getWmStr()+'\n'
    self.cloud.publishCsv(topic,payload)
    
  def sendSnapshot(self):
    # Check if remote snapshot database ready to receive
    if time.time() - self.lastSnapshotRepoMsg > 3:
      self.numSnapshotRepoMsgs = 0
      self.fileInTransit.cancelTransfer()
      return
    elif self.numSnapshotRepoMsgs < 3:
      # Almost ready to receive
      return
    
    # Setup topic name, get list of bagfiles
    topic = 'dt/'+self.name+'/snapshots'
    bagFiles = glob.glob(self.pathToBags+"*.bag")
    
    # Check if we've already opened a file
    if self.fileInTransit.fileOpen == 0:
      for filename in bagFiles:
        self.fileInTransit.setNew(filename)
        break
        
    # Send the file
    if self.fileInTransit.fileOpen == 1:
      tStart = time.time()
      payload = self.fileInTransit.getPayload()
      self.cloud.publishCsv(topic,payload)
      dt = time.time()-tStart
      self.fileInTransit.updateChunkSize(dt)
    
  def parseAgentMail(self):
    msgs = self.cloud.getMail()
    for m in msgs:
      # Command message from remote_monitor
      if 'cmd' in m['topic']:
        for lineData in m['data']:
          if lineData[0] == 's':
            for s in self.subsystems:
              cmd = lineData[2]
              if s.name == lineData[1]:
                if cmd == '0' or cmd == '1':
                  if s.shouldBeStarted != int(cmd):
                    print("Remote cmd:",s.name, int(cmd))
                    s.shouldBeStarted = int(cmd)
                    
      # Heartbeat from remote snapshot database
      elif 'remote_snapshot' in m['topic']:
        self.lastSnapshotRepoMsg = time.time()
        self.numSnapshotRepoMsgs += 1

  def setLaunchAll(self):
    for s in self.subsystems:
      if s.trigger == 'Startup' or s.trigger == 'StartRequest' or s.trigger == 'PMU':
        s.shouldBeStarted = max(1, s.shouldBeStarted)
        
  def setStopRequested(self):
    for s in self.subsystems:
      if s.trigger == 'StartRequest' or s.trigger == 'PMU' or s.trigger == 'ARD':
        s.shouldBeStarted = 0

  def pollMonitors(self):
    # Check if subsystems should be running or stopped
    for s in self.subsystems:
      
      # Should be started
      if s.shouldBeStarted > 0:
        readyToStart = s.status == 0 and s.timeStopped > 1

        # Check for dependencies
        dependenciesMet = True
        for sDepend in s.launchDepend:
          for sOther in self.subsystems:
            if (sDepend != '') and (sDepend in sOther.name) and ((not sOther.readyToMonitor) or (sOther.status < 3)):
              dependenciesMet = False
        
        # If dependencies met, start or restart subsystems as required
        if dependenciesMet:
          if s.restartRequest and s.isStarted == 1:
            s.stop() # Need to stop before restarting
          
          elif readyToStart:
            s.start(s.restartRequest)
      
      # Should be stopped
      else:
        if s.isStarted == True:
          s.stop()

    # Update subsystem status
    ledVec = [0,0,0,0,0,0,0,0]
    for s in self.subsystems:
      # Update subsystem status, returns LED status vector
      sLedVec = s.updateStatus('Update')
      
      # Subsystem specific stuff
      if s.name == 'CAR':
        if s.pmuData[self.pmuAvIdx] == 2 and self.pmuState[self.pmuAvIdx] == 1:
          print('PMU Start Request!')
          self.pmuAvReqHist = 'Started'
          self.setLaunchAll()
          
        if s.pmuData[self.pmuAvIdx] == 1 and self.pmuState[self.pmuAvIdx] == 2 and self.pmuAvReqHist == 'Started':
          print('PMU Stop Request!')
          self.pmuAvReqHist = 'None'
          self.setStopRequested()
          
        # Copy pmu and arduino data to AvAgent object
        self.pmuState = s.pmuData[:]
        self.ardState = s.ardData[:]
      
      # Copy dgp data to wmStatus
      if len(s.dgpData) > 0:
        self.dgpState = s.dgpData[:]
        self.wmStatus.setDgp(self.dgpState)
      
      # Start/Stop subsystems based on Arduino request
      if s.trigger == 'ARD' and s.triggerBit != -1 and s.triggerBit < len(self.ardState):
          if s.isStarted == 0 and self.ardState[s.triggerBit] > 0:
            s.reqStart()
          elif s.isStarted == 1 and self.ardState[s.triggerBit] == 0:
            s.reqStop()
      
      #Update led strip
      for i in range(0,8,1):
        ledVec[i] = max(sLedVec[i], ledVec[i])
      
    # Publis led strip status
    avStatusLedMsg = Int16MultiArray()
    avStatusLedMsg.layout.data_offset = 8
    avStatusLedMsg.data = ledVec
    self.avLedStatusPub.publish(avStatusLedMsg)
