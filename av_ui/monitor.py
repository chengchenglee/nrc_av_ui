#!/usr/bin/python

import time
import numpy as np
import glob

class Monitor:
  def __init__(self, topic):
    self.name = ""
    self.topic = topic
    self.topicType = ""
    self.good = -1
    self.failing = -1
    self.failed = -1
    self.customLedValue = -1
    self.average_message_rate = 0
    self.avgTimeDiff = 0.005
    self.tLastRvcd = time.time()
    self.status = 0
    self.statusStr = '0'
    self.subsystemMode = 'Stopping'
    self.label = 0
    self.displayText = 0
    self.autoText = 0
    self.msgText = "Default"
    self.msgCount = 0
    self.statusText = ""
    self.data = np.zeros(5)
    self.nodeRate   = 0
    self.nodeStatus = 0

  def setRates(self,rates):
    self.good, self.failing, self.failed = rates

  def readStatusStr(self,statusStr):
    lines = statusStr.split('\n')
    data = []
    for line in lines:
      lineData = line.split(',')
      data.append(list(lineData))
      for i in range(len(self.data)):
        if len(lineData) < 2: continue
        if lineData[0] == 'r':
          self.nodeRate = float(lineData[1])
        elif lineData[0] == 's':
          self.nodeStatus = int(lineData[1])

  def msgCallback(self, data):
    current_time = time.time()
    tDiff = min(10, max(0.005, current_time - self.tLastRvcd))
    self.tLastRvcd = current_time
    self.msgCount += 1
    if self.msgCount > 999: self.msgCount = 1

    # Update avgTimeDiff
    alpha = 0.7
    self.avgTimeDiff = min(10, max(0.005, alpha * tDiff + (1-alpha)*self.avgTimeDiff))

    if self.name == "ARD" or self.name == "PMU":
      self.data = data.data[:]
    elif self.name == "DGP":
      self.data[0] = data.pose.position.x
      self.data[1] = data.pose.position.y
      q = data.pose.orientation
      self.data[2] = np.arctan2(2.0 * (q.w*q.z + q.x*q.y),
                          1.0 - 2.0 * (q.y*q.y + q.z*q.z))
      v = np.sqrt(data.twist.linear.x*data.twist.linear.x + data.twist.linear.y*data.twist.linear.y)
      self.data[3] = v
      
      if 'INIT' in data.status_message or 'LOCKING' in data.status_message:
        self.customLedValue = 5  # Purple, init or locking
      elif 'RAW' in data.status_message:
        self.customLedValue = 4  # Blue, no signal yet
      else:
        self.customLedValue = -1
    elif "health" in self.topic:
      self.customLedValue = -1
      for diagStatus in data.status:
        self.readStatusStr(diagStatus.message)
        if diagStatus.level == 4 or diagStatus.level == 5:
          self.customLedValue = max(self.customLedValue, diagStatus.level)
    
  def updateStatus(self,isStarted):
    tDiffFailing = min(3, (1/self.failing))
    tDiffFailed = min(5, 3*(1/self.failed))
    current_time = time.time()
    tDiff = min(10, max(0.005, current_time-self.tLastRvcd))
    
    # Node is self reporting status
    if self.nodeRate > 0 and self.nodeStatus > 0:
      tDiffFailing = 1.1
      tDiffFailed = 2.5
      rate = min(200, max(0, 1/self.avgTimeDiff))
      self.msgText = "Msgs: " + str(self.msgCount) + ", H-Rate: "+str(round(rate,2))+", AlgRate: " + str(round(self.nodeRate,2))+" "+self.statusText
      
      healthMsgStatus = 2
      if tDiff > tDiffFailed or self.avgTimeDiff >= tDiffFailed:
        healthMsgStatus = 1
      elif tDiff < tDiffFailing and self.avgTimeDiff < tDiffFailing:
        healthMsgStatus = 3
      
      self.status = min(self.nodeStatus,healthMsgStatus)
    
    # Determine rate and status from health message rate
    else:
      rate = min(200, max(0, 1/self.avgTimeDiff))
      self.msgText = "MsgCount: " + str(self.msgCount) + ", Rate: " + str(round(rate,2))+", "+self.statusText
    
      if tDiff > tDiffFailed or self.avgTimeDiff >= tDiffFailed:
        self.status = 1
      elif tDiff < tDiffFailing and self.avgTimeDiff < tDiffFailing:
        self.status = 3
      else:
        self.status = 2

    if self.status <= 1:
      if isStarted == 0:
        self.status = 0  # Not ready
      else:
        self.status = 1  # Failed

    if self.status == 0 or self.status == 3:
      self.autoText = 0
    else:
      self.autoText = 1
    
    self.statusStr = str(self.status*1000 + self.msgCount)
    
    return self.status

  def displayMore(self):
    if self.displayText == 0:
      self.displayText = 1
    else:
      self.displayText = 0
