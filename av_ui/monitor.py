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
    self.subsystemMode = 'Stopping'
    self.label = 0
    self.displayText = 0
    self.autoText = 0
    self.msgText = "Default"
    self.msgCounter = 0
    self.statusText = ""
    self.data = np.zeros(5)

  def setRates(self,rates):
    self.good, self.failing, self.failed = rates

  def msgCallback(self, data):
    current_time = time.time()
    tDiff = min(10, max(0.005, current_time - self.tLastRvcd))
    self.tLastRvcd = current_time
    self.msgCounter = self.msgCounter + 1
    if self.msgCounter > 999: self.msgCounter = 0

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
        if diagStatus.level == 4 or diagStatus.level == 5:
          self.customLedValue = max(self.customLedValue, diagStatus.level)
    
  def updateStatus(self,isStarted):
    tDiffFailing = min(3, (1/self.failing))
    tDiffFailed = min(5, 3*(1/self.failed))
    current_time = time.time()
    tDiff = min(10, max(0.005, current_time-self.tLastRvcd))
    rate = min(200, max(0, 1/self.avgTimeDiff))
    
    self.msgText = "MsgCount: " + str(self.msgCounter) + ", Rate: " + str(round(rate,2))+", "+self.statusText
    
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

    return self.status

  def displayMore(self):
    if self.displayText == 0:
      self.displayText = 1
    else:
      self.displayText = 0
