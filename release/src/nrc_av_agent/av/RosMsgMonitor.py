#!/usr/bin/env python

# Ros  Messages
import rospy
import time
import numpy as np

# Image display
import os
import subprocess
import signal

def s2j(str):
  return "\"" + str + "\""

class RosMsgMonitor:
  def __init__(self, labelNameIn, errTargetRateIn, warntargetRateIn, rowIn, colIn, topicNameIn, topicTypeIn):
    self.init = 0
    self.lastMsgStamp = 0
    self.lastGlobalStamp = 0
    self.avgDt = 0
    self.labelName = labelNameIn
    self.topicName = topicNameIn
    self.topicType = topicTypeIn
    self.row = rowIn
    self.col = colIn
    self.errTargetRate = errTargetRateIn
    self.warntargetRate = warntargetRateIn
    self.reqErrorBeep = False
    self.label = 0
    self.displayText = 0 # Toggles manually by user
    self.autoText = 0 # Toggles automatically based on status
    self.msgText = "Text here"
    self.jsonText=""
    self.statusText = ""
    self.msgCounter = 0
    self.data = np.zeros((5,1))
    
  def msgCallback(self, data):
    #self.update(data.header.stamp.to_sec())
    hasHeader = hasattr(data,"header")
    if hasHeader:
     self.update(data.header.stamp.to_sec())
    else:
     self.update(rospy.Time.now().to_sec())
    self.msgCounter += 1
    if self.msgCounter >= 1000:
      self.msgCounter = 1

    if self.labelName == "CAR":
      self.data[0,0] = data.Engaged
      self.data[1,0] = 0
      self.data[2,0] = 0
      if data.BRK_Override:
        self.data[1,0] = .1  # interface_main sleeps for 0.1
      if data.ACC:
        self.data[2,0] = .1 # interface_main sleeps for 0.1
    
  def statusMsgCallback(self, data):
    if self.labelName == "GPS":
      v = np.sqrt(np.square(data.twist.linear.x)+np.square(data.twist.linear.y))
      if self.init == 0:
        self.data[0,0] = data.pose.position.x
        self.data[1,0] = data.pose.position.y
        self.data[2,0] = 0
        self.data[3,0] = v
      elif v > 2 and self.init == 1:
        dx = self.data[0,0] - data.pose.position.x
        dy = self.data[1,0] - data.pose.position.y
        dPose = np.sqrt(dx*dx + dy*dy)
        if dPose > 1.0:
          self.data[0,0] = data.pose.position.x
          self.data[1,0] = data.pose.position.y
          self.data[2,0] = self.data[2,0] + dPose
          self.data[3,0] = v

    self.update(data.header.stamp.to_sec())
    self.statusText = data.status_message
    self.msgCounter += 1
    if self.msgCounter >= 1000:
      self.msgCounter = 0
    
  def update(self, stamp):
    if stamp < 1:
      stamp = rospy.Time.now().to_sec()
    
    if self.init == 0:
      self.init = 1
    if self.init == 1:
      dt = min(5.0, max(0.0, stamp-self.lastMsgStamp))
      avgDt = 0.99*self.avgDt + 0.01*dt
      self.avgDt = avgDt
    
    self.lastMsgStamp = stamp
    self.lastGlobalStamp = rospy.Time.now().to_sec()
    
  def getcolor(self,lbl,severity):
    dtGlobal = rospy.Time.now().to_sec() - self.lastGlobalStamp
    dt = max(self.avgDt, dtGlobal)
    
    #print("dtGlobal: "+dtGlobal)
    if (dt > 0):
      rate = 1/dt
    else:
      rate = 0
    
    self.jsonText = "{" + s2j(self.labelName) + ":{" + s2j("Rate") + ":" + str(round(rate,2)) + "," \
                                              + s2j("Status") + ":"+ s2j(self.statusText)+"}}"
    
    self.msgText = "MsgCount: " + str(self.msgCounter) + ", Rate: " + str(round(rate,2))+", "+self.statusText
    
    if (rate > self.warntargetRate):
      self.reqErrorBeep = False
      lbl.configure(bg="lightgreen")
      self.autoText = 0
    elif (rate > self.errTargetRate):
      self.reqErrorBeep = False
      lbl.configure(bg="orange")
      if (self.msgCounter > 0):
        self.autoText = 1
    else:
      lbl.configure(bg="pink")
      self.reqErrorBeep = True
      if (self.msgCounter > 0):
        self.autoText = 1
  
  def getData(self):
    return self.data
  
  def displayMore(self):
    if self.displayText == 0:
      self.displayText = 1
    else:
      self.displayText = 0
    
    if "cam" in self.topicName:
      # Check if window exists
      child = subprocess.Popen(['pgrep','-f', self.topicName], stdout=subprocess.PIPE, shell=False)
      response = child.communicate()[0]
      if response: 
        print("Found pids: ")
        self.displayText = 0
        for pid in response.split():
          print(pid)
          os.kill(int(pid), signal.SIGKILL)
      else:
        # Open a window
        #cmd = "rosrun image_view image_view image:=" + self.topicName + " _image_transport:=compressed &"
        cmd = "rosrun rqt_image_view rqt_image_view image:=" + self.topicName + "/compressed &"
        #os.system(cmd)
