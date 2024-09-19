#!/usr/bin/python

import json, ast
from collections import OrderedDict
import time
from wmStatus import WmStatus
from heartbeat_msg_defs import HeartbeatData
from waypoints_msg_defs import WaypointData
from ffmpeg_msg_defs import ImgStreamData
from msgs.teleop_msg_defs import TeleopEntry, TeleopCmdData

class MonitoredProcess:
  def __init__(self):
    self.name = []
    self.drawn = False
    self.status = 0
    self.msgCount = 0
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
          m.msgCount = mNew.msgCount
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
    self.agentMsgCount = 0
    self.stateMsgCount = 0
    self.wmStatus = WmStatus()
    self.wmDisplayOn = 0
    self.teleopOn = 0
    self.heartbeat = HeartbeatData()
    self.imgStreamData = ImgStreamData()
    self.teleopCmdData = TeleopCmdData()
    
    # Teleop cmds
    self.lcLeftButton = []
    self.gaLeftButton = []
    self.gaRghtButton = []
    self.lcRghtButton = []

  def update(self,updatedAgentData):
    foundSubsystem = False
    for sNew in updatedAgentData.subsystems:
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
    self.stateMsgCount += 1
    if self.stateMsgCount >= 100: self.stateMsgCount = 1
  
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
    data += 'w,'+str(self.wmDisplayOn)+'\n'
    data += 't,'+str(self.teleopOn)+'\n'
    data += 'idx,'+str(self.agentMsgCount)+'\n'
    if self.cmdsMode == 'Ctrl':
      for s in self.subsystems:
        data += 's,'+s.name+','+str(s.isRunning)+'\n'
    return data
  
  def getTeleopCmd(self):
    # Can be used for testing
    #if False:
      #newCmd = TeleopEntry.fromOru(10, [1,2,3])
      #self.teleopCmdData.commands.append(newCmd)
      #self.teleopCmdData.commands.append(newCmd)
      
    #if (self.teleopCmdData.commands) > 0:
    #  print('Teleop cmd',self.teleopTopic, self.teleopCmdData.toMsg())
    
    return self.teleopCmdData.toMsg()
  
  def parseMsgPayloadCsv(self,data):
    subsystem = MonitoredSubsystem()
    for lineData in data:
      if len(lineData) >= 2 and lineData[0] == 'a':
        self.name = lineData[1]
        self.cmdTopic = 'cmd/'+self.name+'/remote'
        self.teleopTopic = 'cmd/'+self.name+'/teleop'
      elif lineData[0] == 's':
        if subsystem.name != "": self.subsystems.append(subsystem)
        subsystem = MonitoredSubsystem()
        subsystem.name = lineData[1]
        subsystem.monitors = []
      elif lineData[0] == 'm':
        mon = MonitoredProcess()
        mon.name = lineData[1]
        statusData = int(lineData[2])
        mon.msgCount = statusData % 1000
        mon.status = (statusData-mon.msgCount)/1000
        subsystem.monitors.append(mon)
    self.subsystems.append(subsystem)

  def updateWmFromMqtt(self,msgData):
    self.wmStatus.updateFromMqtt2(msgData)

  def updateImgFromMqtt(self,msgData):
    self.imgStreamData.fromMsg(msgData)
    
