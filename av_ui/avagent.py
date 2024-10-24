#!/usr/bin/python

# general stuffs
from os.path import expanduser
import os
import glob
import rospy

# mqtt messages
from msgs.heartbeat_msg_defs import HeartbeatData
from msgs.telemetry_msg_defs import TelemetryData
from msgs.waypoints_msg_defs import WaypointData
from msgs.teleop_msg_defs import TeleopCmdData
from msgs.ffmpeg_msg_defs import ImgStreamData

# Ros messages
from nrc_msgs.msg import InterventionRequest
from std_msgs.msg import Int16MultiArray
from nrc_msgs.msg import TrackedObjectSet,DynamicPoseWithCovar,GpsState
from visualization_msgs.msg import Marker, MarkerArray
from sensor_msgs.msg import CompressedImage
from std_msgs.msg import String

# av agent include files
from include.subsystem import Subsystem
from include.wmStatus import WmStatus
from include.fileInTransit import FileInTransit
import include.loader as Loader
from include.cloud_connection import CloudConnection

import numpy as np
import time
import json, ast
from collections import OrderedDict
import rospkg

# image resize
import io
from PIL import Image

ffmpegTransportExists = True
try:
  from ffmpeg_image_transport_msgs.msg import FFMPEGPacket
except ImportError:
  ffmpegTransportExists = False

class AvAgent:
  def __init__(self, agent_config, agent_name, verbose):
    self.name = agent_name
    home = expanduser("~")
    self.filename = agent_config
    self.mapName = "Franklin.set"
    self.subsystems = []
    self.avLedStatusPub = []
    self.pmuAvIdx = 3
    self.pmuAvReqHist = 'None'
    self.pmuState = [0,0,0,0,0,0,0,0]
    self.ardState = [0,0,0,0,0,0,0,0]
    self.wmStatus = WmStatus()
    self.passThroughWm  = False
    self.passThroughImg = False
    self.remoteWmDisplayOn = 0
    self.remoteWmDisplayLastReq = 0
    self.remoteMonTeleoping = 0
    self.remoteMonLastTeleopSignal = 0
    self.fixedPose = None
    self.tLastImgSent = 0
    self.mqttMsgCount = 0
    self.msgCountTime = []
    self.tZero = time.time()
    self.avgRndTripMsgTime = 0.5
    self.wmImgMinWaitTime = 0
    self.nextMinWaitPrint = 0
    self.timeNextWmSend = 0
    self.timeNextImgSend = 0
    self.compressed_wm_string = []

    # Load the agent configuration
    with open(self.filename, 'r') as file:
      text = file.read()
    printDebug = int(verbose)
    self.subsystems = Loader.read_subsystems(text, printDebug)
    self.mapName = Loader.getField(text,'mapName','Franklin.set')
    #self.mqttConfig = Loader.getField(text,'mqttConfig','local')
    self.useGui  = int(Loader.getField(text,'useGui',1))
    self.sendWm  = int(Loader.getField(text,'sendWm',0))
    self.sendSnapshots  = int(Loader.getField(text,'sendSnapshots',0))
    self.broker = Loader.getField(text, 'broker', 'ncal')
    self.agentType = Loader.getField(text, 'agentType', 'AV4')
    self.agentUrdf = Loader.getField(text, 'agentUrdf', 'leaf')
    self.imgTopic  = Loader.getField(text, 'imgTopic', '/tower_cam_front/image_cropped2/compressed')
    self.wmTopic   = Loader.getField(text, 'wmTopic', '/pc_processor/multi_object_tracker/tracked_object_set')
    self.rosparams = Loader.getSubConfigs(text, 'ROSParams')
    self.printTimeDebug = max(int(Loader.getField(text,'printTimeDebug',0)), int(verbose))
    self.heartbeat = HeartbeatData(self.name,self.agentType)
    self.telemetry = TelemetryData()
    self.teleopCmds = TeleopCmdData()
    
    #if infrapod, get fixed pose
    if self.agentType == 'RSU':
      self.fixedPose = Loader.getField(text,'pose',[])

    # Prepare cloud connection
    self.cloud = CloudConnection(self.name, self.broker)
    #self.cloud.updateConfig(text)
    
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
    self.teleopPub      = rospy.Publisher("ailsv_teleop",MarkerArray, queue_size=1)
    self.poseSub     = rospy.Subscriber("/dynamic_global_pose",     DynamicPoseWithCovar,self.pose_callback,queue_size=1)
    self.pose10hzSub = rospy.Subscriber("/dynamic_global_pose_10Hz",DynamicPoseWithCovar,self.pose10hz_callback,queue_size=1)
    self.gps2hzSub   = rospy.Subscriber("/gps_state/gps_state_oxts_2hz",GpsState,self.gps2hz_callback,queue_size=1)
    self.wmStringSub = rospy.Subscriber("/WmCompressor/wm_string",String,self.compressed_wm_callback,queue_size=1)

    if self.sendWm == 1: 
      self.wmStatusSub = rospy.Subscriber(self.wmTopic, TrackedObjectSet, self.parseWmMsg, queue_size = 1)
    
    self.imgStreamData  = ImgStreamData()
    #if ffmpegTransportExists:
      #self.imgStreamSub   = rospy.Subscriber("/tower_cam_front/stream/ffmpeg", FFMPEGPacket,              self.sendImgStreamPkt, queue_size = 1)
    #  print('Subscribed to ffmpeg packets.')
    #else:
    self.imgFrameSub    = rospy.Subscriber(self.imgTopic, CompressedImage , self.sendImgFramePkt, queue_size = 1)
    print('Subscribed to jpeg packets: ',self.imgTopic)

    # Setup mqtt publishers and subscribers
    self.cloud.init()
    qos = 1
    self.cloud.subscribe(['cmd/'+self.name+'/remote'],qos)
    self.cloud.subscribe(['cmdOnce/'+self.name+'/remote'],2) # Used by FVLA telematics dashboard
    self.cloud.subscribe(['cmd/'+self.name+'/teleop'],qos)
    self.cloud.subscribe(['snp/remote_server/heartbeat'],qos)
    self.cloud.subscribe(['snp/'+self.name+'/resPartList'],qos)
    self.cloud.subscribe(['wyp/'+self.name+'/remote'],qos)
    self.cloud.subscribe(['dt/multi_dest_way_points/'+self.name],qos)

  def parseDgp(self,msg):
    q = msg.pose.orientation
    siny_cosp = 2 * (q.w * q.z + q.x * q.y)
    cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z)
    yaw = np.arctan2(siny_cosp, cosy_cosp)
    
    self.heartbeat.pos_x.value = round(msg.pose.position.x*100.)/100.
    self.heartbeat.pos_y.value = round(msg.pose.position.y*100.)/100.
    self.heartbeat.pos_th.value = round(yaw*10000.)/10000.
    
    v = np.sqrt(msg.twist.linear.x**2 + msg.twist.linear.y**2)
    self.heartbeat.spd.value = round(v*100.)/100.
    self.heartbeat.yawRate.value = round(msg.twist.angular.z*1000.)/1000.

  def pose_callback(self, msg):
    self.parseDgp(msg)
    
  def pose10hz_callback(self, msg):
    self.poseSub.unregister()
    self.parseDgp(msg)
    
  def compressed_wm_callback(self,msg):
    self.compressed_wm_string.append(msg)

  def gps2hz_callback(self,msg):
    self.heartbeat.lat.value = msg.Latitude
    self.heartbeat.lon.value = msg.Longitude
    
  def nextMsgCount(self):
    self.mqttMsgCount += 1
    if self.mqttMsgCount >=1000: self.mqttMsgCount = 1
    self.msgCountTime.append([self.mqttMsgCount,time.time(),5.0])
    tStamp = round((time.time()-self.tZero)*1000)/1000
    #print('Send msg: ', self.mqttMsgCount, tStamp)
    return self.mqttMsgCount
  
  def getTxTime(self,rxMsgCount):
    for entry in self.msgCountTime:
      if rxMsgCount == entry[0]:
        dt = time.time() - entry[1]
        if 0 < dt and dt < entry[2]:
          entry[2] = dt
          dtZero = round((time.time()-self.tZero)*1000)/1000
          #print('Rx msg: ',rxMsgCount,dtZero,round(dt*1000)/1000)
    
    oldList = self.msgCountTime
    newList = []
    for entry in self.msgCountTime:
      dtMeas = time.time() - entry[1]
      if dtMeas < 5 and entry[2] < 5.0:
        newList.append(entry)
    self.msgCountTime = newList
    
  def updateAvgRndTripMsgTime(self):
    updatedRndTripTime = 0.5
    
    avgTime = 0.
    numCount = 0.
    for entry in self.msgCountTime:
      dtMeas = time.time() - entry[1]
      if dtMeas < 5:
        if entry[2] < 5.0:
          avgTime += entry[2]
          numCount += 1.
        elif dtMeas > self.avgRndTripMsgTime:
          avgTime += 4.0
          numCount += 1.
    
    if numCount > 0:
      updatedRndTripTime = avgTime/numCount
      
    # Update average
    self.avgRndTripMsgTime = 0.7*self.avgRndTripMsgTime + 0.3*updatedRndTripTime
    #print('=============== Avg round trip: ',numCount,round(self.avgRndTripMsgTime*1000)/1000)

  def sendStatusCsv(self):
    # Heartbeat message
    qos = 0
    topic = "dt/agents/heartbeat"
    csvStr = self.heartbeat.toMsg(self.nextMsgCount())
    self.cloud.publishCsv(topic,csvStr,qos)
    
    # Telemetry message
    qos = 0
    topic = "dt/"+self.name+"/telemetry"
    csvStr = self.telemetry.toMsg()
    self.cloud.publishCsv(topic,csvStr,qos)
    
    # Subsystem status
    qos = 0
    topic = "dt/"+self.name+"/status"
    data = ''
    data = 'a,'+self.name+'\n'
    for s in self.subsystems:
      data += 's,'+s.name+'\n'
      for m in s.monitors:
        data += 'm,'+m.name+','+m.statusStr+'\n'
    self.cloud.publishCsv(topic,data,qos)
    
  def parseWmMsg(self,msg):
    self.wmStatus.updateObjs(msg)
    self.sendWmStatus()
  
  def sendWmStatus(self):
    if self.passThroughWm and time.time() > self.timeNextWmSend:
      # Copy ego pose
      dgpData = [self.heartbeat.pos_x.value,
              self.heartbeat.pos_y.value,
              self.heartbeat.pos_th.value,
              self.heartbeat.spd.value,
              self.heartbeat.yawRate.value]
      self.wmStatus.setDgp(dgpData)
      
      # Send world model status (ego + other positions)
      qos=0
      topic = 'dt/'+self.name+'/wmState'
      payload = ''
      payload += self.wmStatus.getWmStr2()+'\n'
      if len(self.compressed_wm_string) > 0:
        payload += self.compressed_wm_string[0].data
        self.compressed_wm_string = []
      self.cloud.publishCsv(topic,payload,qos)
      
      self.timeNextWmSend = time.time() + self.wmImgMinWaitTime

  
  def sendImgStreamPkt(self,msg):
    if self.passThroughImg and time.time() > self.timeNextImgSend:
        # Send the msg
        a = 1
        qos = 0
        topic = "dt/"+self.name+"/imgStream"
        mqttData = self.imgStreamData.toMsg(msg)
        self.cloud.publishCsv(topic,mqttData,qos)

        # Update the next send time
        self.timeNextImgSend = time.time() + self.wmImgMinWaitTime
    
  def sendImgFramePkt(self,msg):
    if self.passThroughImg and time.time() > self.timeNextImgSend:
    
      # resize
      image = Image.open(io.BytesIO(msg.data))
      width, height = image.size
      if False:
        image = image.resize((int(0.15*width),int(0.15*height)))
            
        # crop
        width, height = image.size
        left = 0
        right = width-1
        top = height / 3
        bottom = 3 * height / 4
        image = image.crop((left, top, right, bottom))
        width, height = image.size
        
        buffered = io.BytesIO()
        image.save(buffered, format='jpeg')
        msg.data = buffered.getvalue()
        
      qos = 0
      topic = "dt/"+self.name+"/imgStream"
      mqttData = self.imgStreamData.toMsg(msg,width,height)
      self.cloud.publishCsv(topic,mqttData,qos)
      #print('Send jpeg:',time.time()-self.tZero)

      self.timeNextImgSend = time.time() + self.wmImgMinWaitTime
    
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
      qos = 2
      self.cloud.publishCsv(topic,payload,qos)
      dt = time.time()-tStart
      self.fileInTransit.updateChunkSize(dt)
    
    #print('File transfer status: '+self.fileInTransit.state[0]+self.fileInTransit.state[1])
    
  def parseAgentMail(self):
    msgs = self.cloud.getMail()
    for m in msgs:
      #print(m['topic'])
      # Command message from remote_monitor
      receivedAgentMsgCount = -1
      if 'cmd' in m['topic'] and 'remote' in m['topic']:
        for lineData in m['data']:
          if len(lineData) >= 3 and lineData[0] == 's':
            for s in self.subsystems:
              cmd = lineData[2]
              if s.name == lineData[1]:
                if cmd == '0' or cmd == '1':
                  if s.shouldBeStarted != int(cmd):
                    #print("Remote cmd:",s.name, int(cmd))
                    s.shouldBeStarted = int(cmd)
          elif len(lineData) >= 2 and lineData[0] == 'w':
            if int(lineData[1]) == 1:
              self.remoteWmDisplayLastReq = time.time()
            dt = time.time()-self.remoteWmDisplayLastReq
            self.remoteWmDisplayOn = (dt < 1.0) # Some hysteresis
              
          elif len(lineData) >= 2 and lineData[0] == 't':
            if int(lineData[1]) == 1:
              self.remoteMonLastTeleopSignal = time.time()
            dt = time.time() - self.remoteMonLastTeleopSignal
            self.remoteMonTeleoping = (dt < 1.0) # Some hysteresis
            
          elif len(lineData) >=2 and lineData[0] == 'idx':
            receivedAgentMsgCount = int(lineData[1])
              
      elif 'teleop' in m['topic']:
        stamp = time.time()
        rosTime = rospy.Time.now()
        self.teleopCmds.fromMsg(m['data'],stamp)
        ma = self.teleopCmds.toRosMsg(rosTime)
        self.teleopPub.publish(ma)
            
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
              
      elif 'wyp' in m['topic']:
        wp = WaypointData()
        wp.fromMsg(m)
        
      elif 'way' in m['topic']:
        print(m['data'])
        
      if receivedAgentMsgCount > -1:
        dt = self.getTxTime(receivedAgentMsgCount)
        #self.updateAvgRndTripMsgTime()
        
    # Update wait time between sending wm stuff
    fullRateWm = self.remoteMonTeleoping or self.sendWm == 2
    lowRateWm  = self.remoteWmDisplayOn
    self.wmImgMinWaitTime = max(0.09, min(2.0,self.avgRndTripMsgTime*0.5-0.1))
    if fullRateWm:
      if self.wmImgMinWaitTime > 0.2 and time.time() > self.nextMinWaitPrint:
        print('Delay sending wm due to network',self.wmImgMinWaitTime)
        self.nextMinWaitPrint = time.time() + 2.0
      self.wmImgMinWaitTime = max(0.09, self.wmImgMinWaitTime)
    else:
      self.wmImgMinWaitTime = max(0.49, self.wmImgMinWaitTime)
        
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
      #if len(s.dgpData) > 0:
        #self.dgpState = s.dgpData[:]
        #self.wmStatus.setDgp(self.dgpState)
      
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
