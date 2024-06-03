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
    
    self.mode = 'Stopped'
    self.status = 0
    self.timeStopped = 0
    self.timeGood = 0

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
    self.updateStatus('Starting')
    for c in self.commands:
      print("Launch: ", c.name)
      c.start()
    
  def stop(self):
    self.updateStatus('Stopping')
    for c in self.commands:
      print("Stopping: ", c.name)
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
    if source == 'Starting' or source == 'Stopping':
      self.mode = source
      self.status = 0
      self.statusTime = 0
    
    elif source == 'Update':
      
      # Get status from monitors
      minStatus = 3
      for m in self.monitors:
        mStatus = m.getStatus()
        minStatus = min(minStatus, mStatus)

          
      # Handle case when status is supposed to be grey
      if self.mode == 'Stopping' and minStatus <= 1:
        minStatus = 0  # Not ready
        
      # Update subsystem timers
      if minStatus <= 1:
        self.timeStopped = self.timeStopped + 0.1
        self.timeGood = 0
      else:
        self.timeGood = self.timeGood + 0.1
        self.timeStopped = 0
      
      
