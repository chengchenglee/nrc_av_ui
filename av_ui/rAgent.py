#!/usr/bin/python

import json, ast
from collections import OrderedDict
import time
from wmStatus import WmStatus

class MonitoredProcess:
  def __init__(self):
    self.name = []
    self.drawn = False
    self.status = 0
    self.button = []
    self.selected = False
    
  def select(self):
    if self.selected:
      self.selected = False
    else:
      self.selected = True

class MonitoredSubsystem:
  def __init__(self):
    self.name = ""
    self.drawn = False
    self.monitors = []
    self.button = []
    self.stopButton = []
    self.isRunning = 0
    self.selected = False
  
  def update(self,newMonitors):
    minStatus = 10
    for mNew in newMonitors:
      foundMonitor = False
      for m in self.monitors:
        if mNew.name == m.name:
          m.status = mNew.status
          minStatus = min(minStatus,m.status)
          foundMonitor = True
          break
    
      if not foundMonitor:
        self.monitors.append(mNew)
    return minStatus
  
  def select(self):
    if self.selected:
      self.selected = False
    else:
      self.selected = True
      
  def stop(self):
    if self.isRunning:
      self.isRunning = 0
    else:
      self.isRunning = 1

class MonitoredAgent:
  def __init__(self):
    self.name = []
    self.cmdsMode = 'Sync'
    self.cmdTopic = []
    self.cmdData = {}
    self.subsystems = []
    self.drawn = False
    self.expanded = False
    self.button = []
    self.cmdsEnabledButton = []
    self.selected = False
    self.tLastMsg = time.time()
    self.wmStatus = WmStatus()
  
  def update(self,latestSubsystems):
    foundSubsystem = False
    for sNew in latestSubsystems:
      minStatus = 10
      for s in self.subsystems:
        if sNew.name == s.name:
          minStatus = s.update(sNew.monitors)
          if self.cmdsMode == 'Sync':
            if 0 < minStatus and minStatus < 10:
              s.isRunning = 1
            else:
              s.isRunning = 0
          foundSubsystem = True
          break
    
      if not foundSubsystem:
        self.subsystems.append(sNew)
  
  def select(self):
    if self.selected:
      self.selected = False
    else:
      self.selected = True
      self.cmdsMode = 'Sync'
    print("Agent selection:",self.selected)
    
  def setCmds(self):
    if self.cmdsMode == 'Sync':
      self.cmdsMode = 'Ctrl'
    else:
      self.cmdsMode = 'Sync'
    
  def printStatus(self):
    print("Agent:",self.name)
    for s in self.subsystems:
      print("  Subsystem:",s.name)
      for m in s.monitors:
        print("    Process:",m.name,m.status)
  
  def getCmdData(self):
    data = ''
    if self.cmdsMode == 'Ctrl':
      for s in self.subsystems:
        data += 's,'+s.name+','+str(s.isRunning)+'\n'
    return data
  
  def parseMsgPayloadCsv(self,payload):
    payload = payload.strip('\"')
    lines = payload.split('\n')
    subsystem = MonitoredSubsystem()
    for line in lines:
      #print(line)
      code = line.split(',')[0]
      if code == 'a':
        self.name = line.split(',')[1]
        self.cmdTopic = 'cmd/'+self.name+'/remote'
      elif code == 's':
        if subsystem.name != "": self.subsystems.append(subsystem)
        subsystem = MonitoredSubsystem()
        subsystem.name = line.split(',')[1]
        subsystem.monitors = []
      elif code == 'm':
        mon = MonitoredProcess()
        mon.name = line.split(',')[1]
        mon.status = int(line.split(',')[2])
        subsystem.monitors.append(mon)
    self.subsystems.append(subsystem)
    #self.printStatus()
  
  #def parseMsgPayload(self,payload):
    ##msgJson = ast.literal_eval(msg.payload)
    #msgJson = json.loads(payload,object_pairs_hook=OrderedDict)
    ##print(msgJson)
    
    #keys = list(msgJson.keys())
    #if "agent" in keys:
      #self.name = msgJson["agent"]
      #self.cmdTopic = 'cmd/'+self.name+'/remote'
    
    #if "subs" in keys:
      #subDict = msgJson["subs"]
      #subsList = list(subDict.keys())
      #for s in subsList:
        #subsystem = MonitoredSubsystem()
        #subsystem.name = s
        #monDict = subDict[s]
        #monsList = list(monDict.keys())
        #for m in monsList:
          #mon = MonitoredProcess()
          #mon.name = m
          #mon.status = monDict[m]
          #subsystem.monitors.append(mon)
        #self.subsystems.append(subsystem)
