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
    self.time_since_last_received = time.time()

  def setRates(self,rates):
    self.good, self.failing, self.failed = rates
    
  #def printInfo():
  #  print(self.name)
  #  print(self.topic)
  #  print(self.good,self.failing,self.failed)

  def update_message_received(self):
    current_time = time.time()
    time_difference = current_time - self.time_since_last_received
    self.time_since_last_received = current_time
    # Using exponential moving average with a time constant of 3 seconds
    alpha = 1 - exp(-time_difference / 3)
    self.average_message_rate = alpha * (1/time_difference) + (1 - alpha) * self.average_message_rate

  def msgCallback(self, data):
    a = 1

  def displayMore(self):
    a = 1
