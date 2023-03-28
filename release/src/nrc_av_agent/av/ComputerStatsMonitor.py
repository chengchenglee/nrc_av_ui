#!/usr/bin/env python

# Ros  Messages
import rospy
import time

# Ping
import os
import subprocess
import signal
import multiprocessing

def s2j(str):
  return "\"" + str + "\""

class ComputerStatsMonitor:
  def __init__(self, labelNameIn, hostIpIn, rowIn, colIn, rosMsgNameIn):
    self.labelName = labelNameIn
    self.hostIp = hostIpIn
    self.rosMsgName = rosMsgNameIn
    self.row = rowIn
    self.col = colIn
    self.init = 0
    self.avgDt = 0
    self.lastMsgStamp = 0
    self.lastGlobalStamp = 0
    self.ping = 0
    self.cpuLoad = 0
    self.cpuTemp = 0
    self.networkLoad = 0
    self.label = 0
    self.displayText = 0 # Toggles manually by user
    self.autoText = 0 # Toggles automatically by status
    self.msgText="Ping time to go here"
    self.jsonText=""
    self.statusText = ""
    self.msgCounter = 0
    
  def check_ping(self):
    cmd = "timeout 0.2 ping -c 1 " + self.hostIp
    response = 0
    #response = os.system(cmd)
    if response == 0:
      self.ping = 1
    else:
      self.ping = 0
      
  def cpuStatsCallback(self, data):
      self.cpuLoad = max(data.data)
      self.msgCounter += 1
      if self.msgCounter >= 1000:
        self.msgCounter = 1
      
      stamp = data.header.stamp.to_sec()
      if (self.init == 0):
        self.init = 1
      else:
        dt = min(5.0, max(0.0, stamp-self.lastMsgStamp))
        avgDt = 0.99*self.avgDt + 0.01*dt
        self.avgDt = avgDt
        
      self.lastMsgStamp = stamp
      self.lastGlobalStamp = rospy.Time.now().to_sec()
      
  def cpuTempCallback(self, data):
      self.cpuTemp = data.data
      
  def cpuNetCallback(self, data):
      self.networkLoad = data.data
      
  def displayMore(self):
    if self.displayText == 0:
      self.displayText = 1
    else:
      self.displayText = 0
      
  def getcolor(self,lbl,severity):
    if self.ping == 0:
      pingMsg = "Fail"
    else:
      pingMsg = "OK"
      
    dt = max(self.avgDt, rospy.Time.now().to_sec())
    dt = self.avgDt
    
    if (dt > 0):
      rate = 1/dt
    else:
      rate = 0
    
    if self.msgCounter > 0:
      self.msgText = "Ping: " + pingMsg + ", MsgCount: " + str(self.msgCounter) \
					+ ", Temp: " + str(self.cpuTemp) \
					+ ", CPU: " + str(self.cpuLoad) \
					+ ", Network: " + str(self.networkLoad)

      self.jsonText = "{" + s2j(self.labelName) + ":{" + s2j("Ping")    + ":" + s2j(pingMsg) + "," \
                                                       + s2j("Temp")    + ":" + self.cpuTemp + "," \
                                                       + s2j("Network") + ":" + self.cpuLoad + "," \
					               + s2j("CPULoad") + ":" + self.networkLoad + "}}"
    else:
      self.msgText = "Ping: " + pingMsg
      self.jsonText = "{" + s2j(self.labelName) + ":{" + s2j("Ping")    + ":" + s2j(pingMsg) + "}}"
    
    if self.cpuTemp > 85 or self.ping == 0:
      lbl.configure(bg="orange")
      if (self.msgCounter > 0):
        self.autoText = 1
      severity = max(3,severity)
    else:
      lbl.configure(bg="lightgreen")
      self.autoText = 0
