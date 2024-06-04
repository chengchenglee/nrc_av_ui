#!/usr/bin/python

import time

class Monitor:
  def __init__(self, topic):
    self.name = ""
    self.topic = topic
    self.topicType = ""
    self.good = -1
    self.failing = -1
    self.failed = -1
    self.average_message_rate = 0
    self.avgTimeDiff = 0
    self.tLastRvcd = time.time()
    self.status = 0
    self.subsystemMode = 'Stopping'
    self.label = 0

  def setRates(self,rates):
    self.good, self.failing, self.failed = rates

  def msgCallback(self, data):
    current_time = time.time()
    tDiff = min(10, max(0.005, current_time - self.tLastRvcd))
    self.tLastRvcd = current_time
    
    # Using exponential moving average with a time constant of 3 seconds
    #alpha = 1 - exp(-tDiff / 3)
    alpha = 0.7
    self.avgTimeDiff = min(10, max(0.005, alpha * tDiff + (1-alpha)*self.avgTimeDiff))
    #print('msgCallback:',self.avgTimeDiff)
    
  def updateStatus(self,isStarted):
    tDiffFailing = min(3, (1/self.failing))
    tDiffFailed = min(5, 3*(1/self.failed))
    current_time = time.time()
    tDiff = min(10, max(0.005, current_time-self.tLastRvcd))
    
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

    return self.status

  def displayMore(self):
    a = 1
