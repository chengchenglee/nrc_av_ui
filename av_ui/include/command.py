#!/usr/bin/python

import os
import time
import subprocess, psutil

class Command:
  def __init__(self, name):
    self.name = name
    self.command = ""
    self.nodeName = ""
    self.launchTime = 30
    self.started = False
    self.pid = []
    self.foundPid = 0
    #self.childPids = []
    
  def start(self):
    print(self.command)
    if not self.started:
      self.pid = []
      proc = subprocess.Popen([self.command],
                              shell=True)
      time.sleep(0.5)
      self.pid = proc.pid

      print(self.nodeName +": "+str(self.pid))
      self.started = True

  def stop(self):
    if (self.started):
      command = "pkill -TERM -P"+str(self.pid)
      os.system(command)
      self.started  = False
      self.foundPid = 0
      time.sleep(0.25)
      return
        
  def updateStatus(self):
    if self.pid:
      self.childPids = []
      success = True
      if self.foundPid < 20:
        try:
          parent = psutil.Process(self.pid)
        except psutil.NoSuchProcess:
          success = False
      
        self.foundPid += 1

      #children = parent.children(recursive=True)
      #for child in children:
      #  self.childPids.append(child.pid)
      #print(self.pid,self.childPids)
