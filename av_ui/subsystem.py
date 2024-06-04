#!/usr/bin/python

from monitor import Monitor
from command import Command

class Subsystem:
  def __init__(self, name):
    self.name = name
    self.commands = []
    self.monitors = []
    self.launchDepend = []
    self.runDepend = []
        
    # Status
    self.isStarted = 0
    self.status = 0
    #self.timeStopped = 0
    #self.timeStarted = 0
    self.timeFailing = 0
    
    # Diagnostics
    self.ledIdx = -1
    self.numRetries = 0
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
    
  def start(self):
    self.updateStatus('Start')
    for c in self.commands:
      print("Start: ", c.name)
      c.start()
    
  def stop(self):
    self.updateStatus('Stop')
    self.readyToMonitor = False
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
  
  def updateStatus(self,source):
    if source == 'Start' or source == 'Stop':
      if source == 'Start':
        self.isStarted = 1
      else:
        self.isStarted = 0
      self.statusTime = 0
    
    elif source == 'Update':
      # Get status from monitors
      self.status = 3
      for m in self.monitors:
        mStatus = m.updateStatus(self.isStarted)
        self.status = min(self.status, mStatus)

      # Update subsystem timers
      if self.isStarted == 0:
        self.status = 0
      else:
        # Check if subsystem needs restarting
        if self.readyToMonitor == False:
          if self.status >= 2:
            self.readyToMonitor = True
            print("Ready to monitor:",self.name)
        else:
          if self.status >= 2:
            self.timeFailing = 0
          else:
            if self.timeFailing < self.timeout:
              print("Subsystem failing:",self.name,self.timeFailing,self.timeout)
              self.timeFailing = self.timeFailing + 0.1
            else:
              self.restartRequest = True
              print("Restart request:",self.name)
      
