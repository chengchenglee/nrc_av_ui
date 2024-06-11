#!/usr/bin/python

import json, ast
from collections import OrderedDict

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
    self.name = []
    self.drawn = False
    self.monitors = []
    self.button = []
    self.stopButton = []
    self.isRunning = 0
    self.selected = False
  
  def update(self,newMonitors):
    foundMonitor = False
    for mNew in newMonitors:
      for m in self.monitors:
        if mNew.name == m.name:
          m.status = mNew.status
          foundMonitor = True
          break
    
      if not foundMonitor:
        self.monitors.append(mNew)
  
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
    self.cmdTopic = []
    self.cmdData = {}
    self.subsystems = []
    self.drawn = False
    self.expanded = False
    self.button = []
    self.selected = False
  
  def update(self,latestSubsystems):
    foundSubsystem = False
    for sNew in latestSubsystems:
      for s in self.subsystems:
        if sNew.name == s.name:
          s.update(sNew.monitors)
          foundSubsystem = True
          break
    
      if not foundSubsystem:
        self.subsystems.append(sNew)
  
  def select(self):
    if self.selected:
      self.selected = False
    else:
      self.selected = True
    print("Agent selection:",self.selected)
    
  def printStatus(self):
    print("Agent:",self.name)
    for s in self.subsystems:
      print("  Subsystem:",s.name)
      for m in s.monitors:
        print("    Process:",m.name,m.status)
  
  def getCmdData(self):
    data = OrderedDict()
    for s in self.subsystems:
      data[s.name] = s.isRunning
    return data
  
  def parseMsgPayload(self,payload):
    #msgJson = ast.literal_eval(msg.payload)
    msgJson = json.loads(payload,object_pairs_hook=OrderedDict)
    #print(msgJson)
    
    keys = list(msgJson.keys())
    if "agent" in keys:
      self.name = msgJson["agent"].decode('unicode-escape')
      self.cmdTopic = 'cmd/'+self.name+'/remote'
    
    if "subs" in keys:
      subDict = msgJson["subs"]
      subsList = list(subDict.keys())
      for s in subsList:
        subsystem = MonitoredSubsystem()
        subsystem.name = s
        monDict = subDict[s]
        monsList = list(monDict.keys())
        for m in monsList:
          mon = MonitoredProcess()
          mon.name = m
          mon.status = monDict[m]
          subsystem.monitors.append(mon)
        self.subsystems.append(subsystem)
