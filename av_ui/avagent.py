#!/usr/bin/python

from os.path import expanduser
import os
import glob
import rospy
from subsystem import Subsystem
from wmStatus import WmStatus
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
    self.avStatusPub = []
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
    self.currentSnapshotFile = ''
    self.currentSnapshotFilesize = 0
    self.snapshotChunkSendTime = 0
    self.snapshotChunkSize = 500
    self.snapshotDataSent = 0
    print ("useGui: "+str(self.useGui))
    print ("sendWm: "+str(self.sendWm))
    print ("sendSnapshots: "+str(self.sendSnapshots))
    self.cloud = CloudConnection(self.name)
    self.cloud.updateConfig(text)

  def pubSubSetup(self):
    rospy.init_node('listener', anonymous=True)  # AvAgent Node
    Loader.subscribe_health_msgs(self.subsystems)
    self.avStatusPub = rospy.Publisher("ailsv_av_status",InterventionRequest,queue_size=1)
    self.avLedStatusPub = rospy.Publisher("ailsv_av_led",Int16MultiArray,queue_size=1)
    if self.sendWm == 1: 
      self.wmStatusSub = rospy.Subscriber("pc_processor/multi_object_tracker/tracked_object_set", TrackedObjectSet, self.wmStatus.updateObjs, queue_size = 1)
    
    self.cloud.init()
    self.cloud.subscribe(['cmd/'+self.name+'/remote'])
    
  def sentStatusCsv(self):
    topic = "dt/agents/heartbeat"
    data = ''
    data +='a,'+self.name
    self.cloud.publishCsv(topic,data)
    
    topic = "dt/"+self.name+"/status"
    data = ''
    data = 'a,'+self.name+'\n'
    for s in self.subsystems:
      data += 's,'+s.name+'\n'
      for m in s.monitors:
        data += 'm,'+m.name+','+str(m.status)+'\n'
    self.cloud.publishCsv(topic,data)
  
  def sendWmStatus(self):
    topic = 'dt/'+self.name+'/wmState'
    payload = ''
    payload += self.wmStatus.getWmStr()+'\n'
    self.cloud.publishCsv(topic,payload)
    
  def splitfile(self, filename, size=1000):
    chunks = []
    with open(filename) as f:
      chunk = f.read(size)
      while chunk:
        chunks.append(chunk)
        chunk = f.read(size)
    return chunks
    
  def sendSnapshot(self):
    # Setup topic name, file directory
    topic = 'dt/'+self.name+'/snapshots'
    tStart = time.time()
    todaysDate = ''.join(time.strftime("%Y-%m-%d"))
    pathToBags = '/opt/data/snapshots/'+todaysDate+'/'
    bagFiles = glob.glob(pathToBags+"*.bag")
    
    # Check if we've already opened a file
    if self.currentSnapshotFile == '':
      for filename in bagFiles:
        self.currentSnapshotFilesize = os.path.getsize(filename)
        print('============= Send file:',filename,str(self.currentSnapshotFilesize)+'=============')
        self.currentSnapshotFile = open(filename)
        break
        
    # Continue sending the file
    chunk = self.currentSnapshotFile.read(self.snapshotChunkSize)
    if chunk:
      if False:
        tStart = time.time()
        self.cloud.publishCsv(topic,chunk)
        dt = time.time()-tStart
        self.snapshotDataSent += self.snapshotChunkSize
        print('Sending snapshot:'+str(self.snapshotDataSent)+'/'+str(self.currentSnapshotFilesize)+', '+str(self.snapshotChunkSize))
        if dt < 0.08:
          self.snapshotChunkSize = min(200000, self.snapshotChunkSize+200)
        elif dt > 0.12:
          self.snapshotChunkSize = max(100,self.snapshotChunkSize-1000)
      else:
        self.snapshotChunkSize = 2000000
    
    # Done sending the file
    else:
      self.currentSnapshotFile.close()
      self.currentSnapshotFile = ''
      self.snapshotDataSent = 0
    
  def getCmds(self):
    msgs = self.cloud.getMail()
    for m in msgs:
      for lineData in m['data']:
        if lineData[0] == 's':
          for s in self.subsystems:
            cmd = lineData[2]
            if s.name == lineData[1]:
              if cmd == '0' or cmd == '1':
                if s.shouldBeStarted != int(cmd):
                  print("Remote cmd:",s.name, int(cmd))
                  s.shouldBeStarted = int(cmd)

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
      
      if len(s.dgpData) > 0:
        self.dgpState = s.dgpData[:]
        self.wmStatus.setDgp(self.dgpState)
      
      if s.trigger == 'ARD' and s.triggerBit != -1 and s.triggerBit < len(self.ardState):
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
