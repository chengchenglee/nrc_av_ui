#!/usr/bin/python

import os
import time

class Command:
  def __init__(self, name):
    self.name = name
    self.command = ""
    self.nodeName = ""
    self.launchTime = 30
    self.started = False
    
  def start(self):
    print(self.command)
    if not self.started:
      currentDir = os.getcwd()
      nrcWsPath = os.path.join(os.path.expanduser("~"), 'projects/nrc_ws')
      os.chdir(nrcWsPath)
      os.system(self.command+" &")
      os.chdir(currentDir)
      self.started = True

  def stop(self):
    if (self.started):
      if 'rosrun' in self.command:
        if self.nodeName != "":
          command = "rosnode kill "+self.nodeName
          os.system(command)
          print(command)
          self.started = False
      elif  ("ntrip" in self.command) or ("Ntrip" in self.command):
        # kill ntrip script by pkill -f
        print ("Stopping ntrip script")
        os.system("pkill -f ntrip")
        self.started = False
      else:
        # Get nodes list from roslaunch file
        nodes = os.popen(self.command+" --nodes &").read()
        command = "rosnode kill"
        for row in nodes.split('\n'):
          node = row.rstrip('\n')
          command = command + " " + node[1:]
        
        print (command)
        os.system(command)
        time.sleep(1.0)
        self.started = False
