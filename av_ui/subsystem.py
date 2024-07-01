#!/usr/bin/python

from monitor import Monitor
from command import Command
import numpy as np

class Subsystem:
  def __init__(self, name):
    self.name = name
    self.commands = []
    self.monitors = []
    self.launchDepend = []
    self.runDepend = []
        
    # Status
    self.trigger = 'StartRequest'
    self.triggerBit = -1
    self.PMU_AD_ON_BIT = 3
    self.ardData = []
    self.pmuData = []
    self.dgpData = []
    self.shouldBeStarted = 0
    self.isStarted = False
    self.status = 0
    self.customDiagLed = -1
    self.timeGood = 0
    self.timeStopped = 0
    self.timeFailing = 0
    
    # Diagnostics
    self.ledIdx = -1
    self.maxRetries = 0
    self.startsRemaining = 1
    self.timeout = 30
    self.readyToMonitor = False
    self.restartRequest = False
    
    # Interface
    self.startButton = []
    self.stopButton = []

  def add_command(self, command, printDebug):
    self.commands.append(command)
    if printDebug: print("Add command",len(self.commands),":", command.name)

  def add_monitor(self, monitor, printDebug):
    self.monitors.append(monitor)
    if printDebug: print("Add monitor",len(self.monitors),":", monitor.name, monitor.topic, monitor.good, monitor.failing, monitor.failed)
    
  def add_launch_depend(self,name):
    self.launchDepend.append(name)

  def add_run_depend(self,name):
    self.runDepend.append(name)
  
  def reqStart(self):
    self.shouldBeStarted = 2
    self.startsRemaining = 1+self.maxRetries
    
  def reqStop(self):
    self.shouldBeStarted = 0
    
  def start(self,isRestart = False):
    if isRestart == True:
      print("Relaunch:",self.name)
    else:
      print("Launch:",self.name)
    
    if self.isStarted == False:
      self.startsRemaining = self.startsRemaining - 1
      for c in self.commands:
        print("Start: ", c.name)
        c.start()
    
      self.updateStatus('Start')
    
  def stop(self):
    self.updateStatus('Stop')
    self.readyToMonitor = False
    self.isStarted = False
    for c in self.commands:
      print("Stop: ", c.name)
      c.stop()
  
  def stateToString(status):
    if status == 0:
      return 'Not Ready'
    elif status == 1:
      return 'Failed'
    elif status == 2:
      return 'Failing'
    elif status == 3:
      return 'Good'
    
  def getBitField(self,data):
    value = max(0,min(255,data[0]))
    bitField = np.zeros(8)
    for bit in range(7,0,-1):
      bitValue = 2**(bit)
      if value >= bitValue:
        bitField[bit] = 1
        value -= bitValue
      
    return bitField
  
  def updateStatus(self,source):
    ledStatus = [0,0,0,0,0,0,0,0]
    customLedValue = -1
    if source == 'Start' or source == 'Stop':
      if source == 'Start':
        self.isStarted = 1
        self.restartRequest = False
      else:
        self.isStarted = 0
      self.statusTime = 0
        
    elif source == 'Update':
      # Get status from monitors
      self.status = 10
      for c in self.commands:
        c.updateStatus()
      
      for m in self.monitors:
        mStatus = m.updateStatus(self.isStarted)
        self.status = min(self.status, mStatus)
        
        if m.name == 'ARD':
          self.ardData = []
          for val in m.data:
            self.ardData.append(val)
        elif m.name == 'PMU':
          self.pmuData = []
          for val in m.data:
            self.pmuData.append(val)
        elif m.name == 'DGP':
          self.dgpData = []
          for val in m.data:
            self.dgpData.append(val)
        
        if m.customLedValue != -1:
          customLedValue = m.customLedValue

      # Update subsystem timers
      if self.isStarted == 0:
        self.status = 0
        self.timeGood = 0
        self.timeStopped = self.timeStopped + 0.1

      else:
        # Check if subsystem needs restarting
        if self.readyToMonitor == False:
          if self.status >= 2:
            if self.timeGood < 2:
              self.timeGood = self.timeGood + 0.1
            else:
              self.readyToMonitor = True
              print("Ready to monitor:",self.name)

        else:
          if self.status >= 2:
            self.timeFailing = 0
            self.restartRequest = False
          else:
            if self.timeFailing < self.timeout:
              print("Subsystem failing:",self.name,self.timeFailing,self.timeout)
              self.timeFailing = self.timeFailing + 0.1
            else:
              if self.startsRemaining > 0:
                self.restartRequest = True
                print("Restart request:",self.name)
                
    # LED_COLORS {Red=0, Yellow=1, Green=2, Black=3, Blue=4, Purple=5};
    if self.ledIdx != -1 and self.ledIdx < 8:
      if self.status == 0 or self.status == 10:
        ledStatus[self.ledIdx] = 3 # Black
      else:
        if customLedValue != -1:
          ledStatus[self.ledIdx] = customLedValue
        else:
          ledStatus[self.ledIdx] = self.status-1
        
    return ledStatus
