#!/usr/bin/python

from os.path import expanduser
import os
import glob
import rospy
from heartbeat_msg_defs import HeartbeatData
from telemetry_msg_defs import TelemetryData
from subsystem import Subsystem
from wmStatus import WmStatus
from fileInTransit import FileInTransit
import loader as Loader
from nrc_msgs.msg import InterventionRequest
from std_msgs.msg import Int16MultiArray
from nrc_msgs.msg import TrackedObjectSet,DynamicPoseWithCovar
import numpy as np
import tf.transformations
import time
from cloud_connection import CloudConnection
import json, ast
from collections import OrderedDict
import rospkg

class AvAgent:
  def __init__(self, agent_config, agent_name, verbose):
    self.name = agent_name
    home = expanduser("~")
    self.filename = agent_config
    self.mapName = "Franklin.set"
    # self.mapName = rospy.get_param('~map_name', 'Franklin.set') 
    self.subsystems = []
    self.avLedStatusPub = []
    self.pmuAvIdx = 3
    self.pmuAvReqHist = 'None'
    self.pmuState = [0,0,0,0,0,0,0,0]
    self.ardState = [0,0,0,0,0,0,0,0]
    self.wmStatus = WmStatus()
    self.remoteWmDisplayOn = 0
    self.remoteWmDisplayLastReq = 0
    self.fixedPose = None

    # Load the agent configuration
    with open(self.filename, 'r') as file:
      text = file.read()
    printDebug = int(verbose)
    self.subsystems = Loader.read_subsystems(text, printDebug)
    self.mapName = Loader.getField(text,'mapName','Franklin.set')
    self.mqttConfig = Loader.getField(text,'mqttConfig','local')
    self.useGui  = int(Loader.getField(text,'useGui',1))
    self.sendWm  = int(Loader.getField(text,'sendWm',0))
    self.sendSnapshots  = int(Loader.getField(text,'sendSnapshots',0))
    self.broker = Loader.getField(text, 'broker', 'ncal')
    self.agentType = Loader.getField(text, 'agentType', 'AV4')
    self.agentUrdf = Loader.getField(text, 'agentUrdf', 'leaf')
    self.rosparams = Loader.getSubConfigs(text, 'ROSParams')
    self.printTimeDebug = max(int(Loader.getField(text,'printTimeDebug',0)), int(verbose))
    self.heartbeat = HeartbeatData(self.name,self.agentType)
    self.telemetry = TelemetryData()
    
    #if infrapod, get fixed pose
    if self.agentType == 'RSU':
      self.fixedPose = Loader.getField(text,'pose',[])

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
    self.poseSub     = rospy.Subscriber("/dynamic_global_pose",     DynamicPoseWithCovar,self.pose_callback,queue_size=1)
    self.pose10hzSub = rospy.Subscriber("/dynamic_global_pose_10Hz",DynamicPoseWithCovar,self.pose10hz_callback,queue_size=1)
    if self.sendWm == 1: 
      self.wmStatusSub = rospy.Subscriber("pc_processor/multi_object_tracker/tracked_object_set", TrackedObjectSet, self.wmStatus.updateObjs, queue_size = 1)

    # Setup mqtt publishers and subscribers
    self.cloud.init(self.mqttConfig)
    self.cloud.subscribe(['cmd/'+self.name+'/remote'])
    self.cloud.subscribe(['snp/remote_server/heartbeat'])
    self.cloud.subscribe(['snp/'+self.name+'/resPartList'])

  def pose_callback(self, msg):
    #self.x_position = msg.pose.position.x
    #self.y_position = msg.pose.position.y
    orientation_list = [msg.pose.orientation.x, msg.pose.orientation.y, msg.pose.orientation.z, msg.pose.orientation.w]
    (roll, pitch, yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    #self.th_heading = yaw
    
    self.heartbeat.pos_x.value = msg.pose.position.x
    self.heartbeat.pos_y.value = msg.pose.position.y
    self.heartbeat.pos_th.value = yaw
    
  def pose10hz_callback(self, msg):
    self.poseSub.unregister()
    orientation_list = [msg.pose.orientation.x, msg.pose.orientation.y, msg.pose.orientation.z, msg.pose.orientation.w]
    (roll, pitch, yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    
    self.heartbeat.pos_x.value = msg.pose.position.x
    self.heartbeat.pos_y.value = msg.pose.position.y
    self.heartbeat.pos_th.value = yaw

  def sendStatusCsv(self):
    # Heartbeat message
    qos = 0
    topic = "dt/agents/heartbeat"
    csvStr = self.heartbeat.toMsg()
    #data = ''
    #data +='a,'+self.name + ','+ str(self.x_position) + ',' + str(self.y_position) + ',' + str(self.th_heading)
    self.cloud.publishCsv(topic,csvStr,qos)
    
    # Telemetry message
    qos = 0
    topic = "dt/"+self.name+"/telemetry"
    csvStr = self.telemetry.toMsg()
    self.cloud.publishCsv(topic,csvStr,qos)
    
    # Subsystem status
    topic = "dt/"+self.name+"/status"
    data = ''
    data = 'a,'+self.name+'\n'
    for s in self.subsystems:
      data += 's,'+s.name+'\n'
      for m in s.monitors:
        data += 'm,'+m.name+','+m.statusStr+'\n'
    self.cloud.publishCsv(topic,data,qos)
  
  def sendWmStatus(self):
    # Send world model status (ego + other positions)
    qos=0
    topic = 'dt/'+self.name+'/wmState'
    payload = ''
    payload += self.wmStatus.getWmStr()+'\n'
    self.cloud.publishCsv(topic,payload,qos)
    
  def getFilenameToSend(self,partList):
    # Get list of all files in directory
    bagFiles = glob.glob(self.pathToBags+"*.bag")
    
    # Pick one to send
    anyFilename = ['',0]
    matchFilename = ['',0]
    for filename in bagFiles:
      if time.time() - os.path.getmtime(filename) < 3:
        print('Snapshot: New file, but waiting for it to finish writing to disk.')
        continue
      anyFilename = [filename,0]
      for partFile in partList:
        if partFile[0] in filename:
          matchFilename = [filename,partFile[1]]
          break;
    
    if not matchFilename[0] == '':
      return matchFilename
    else:
      return anyFilename
      
  def sendSnapshot(self):
    # Debounce remote server heartbeat
    if time.time() - self.lastSnapshotRepoMsg > 3:
      self.numSnapshotRepoMsgs = 0
      self.fileInTransit.cancelTransfer()
      self.fileInTransit.state = ['Wait',', No server heartbeat']
      
    # Wait for remote server heartbeat
    elif self.numSnapshotRepoMsgs < 3:
      self.fileInTransit.state = ['Wait',', Debounce server heartbeat']

    elif self.fileInTransit.state[0] == 'Wait':
      self.fileInTransit.state = ['Idle',', Remote server ready']

    # Check if remote server has partial transfers
    if self.fileInTransit.state[0] == 'Idle':
      topic = 'snp/'+self.name+'/reqPartList'
      payload = 'c,ReqPartList'
      qos = 2
      self.cloud.publishCsv(topic,payload,qos)
      self.fileInTransit.state = ['Requested',', Requested partial transfer list']
      
    # Wait for response
    elif self.fileInTransit.state[0] == 'Requested':
      a = 1

    elif self.fileInTransit.state[0] == 'Begin':
      # Open the file, prepare to send
      fileInfo = self.getFilenameToSend(self.fileInTransit.state[1:])
      if fileInfo[0] == '':
        # Wait in this state until new snapshot shows up
        self.fileInTransit.state = ['Begin',', Wait for new snapshots...']
        self.fileInTransit.debounceNewFile = time.time()
      else:
        #if (time.time()-self.fileInTransit.debounceNewFile > 3) :
        self.fileInTransit.setNew(fileInfo)
        self.fileInTransit.state = ['Sending','']
      
    # Send a chunk of data
    if self.fileInTransit.state[0] == 'Sending':
      tStart = time.time()
      payload = self.fileInTransit.getPayload()
      topic = 'snp/'+self.name+'/data'
      self.cloud.publishCsv(topic,payload)
      dt = time.time()-tStart
      self.fileInTransit.updateChunkSize(dt)
    
    #print('File transfer status: '+self.fileInTransit.state[0]+self.fileInTransit.state[1])
    
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
          elif lineData[0] == 'w':
            self.remoteWmDisplayOn = int(lineData[1])
            if self.remoteWmDisplayOn == 1:
              self.remoteWmDisplayLastReq = time.time()
            
      # Heartbeat from remote snapshot database
      elif 'snp/remote_server/heartbeat' in m['topic']:
        #print('Rx snapshot server heartbeat')
        self.lastSnapshotRepoMsg = time.time()
        self.numSnapshotRepoMsgs += 1
        
      elif 'resPartList' in m['topic']:
        if self.fileInTransit.state[0] == 'Requested':
          self.fileInTransit.state = ['Begin']
          for lineData in m['data']:
            if len(lineData) < 3:
              self.fileInTransit.state.append(['None',0])
            else:
              self.fileInTransit.state.append([str(lineData[1]),int(lineData[2])+1])
        
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
        try:
          if s.pmuData[self.pmuAvIdx] == 2 and self.pmuState[self.pmuAvIdx] == 1:
            print('PMU Start Request!')
            self.pmuAvReqHist = 'Started'
            self.setLaunchAll()
        except:
          pass
        try:
          if s.pmuData[self.pmuAvIdx] == 1 and self.pmuState[self.pmuAvIdx] == 2 and self.pmuAvReqHist == 'Started':
            print('PMU Stop Request!')
            self.pmuAvReqHist = 'None'
            self.setStopRequested()
        except:
          pass
          
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
