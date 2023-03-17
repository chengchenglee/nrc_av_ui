#!/usr/bin/env python

# Ros  Messages
import rospy
import time

# Image display
import os

class RosCmd:
  def __init__(self, cmdNameIn, rowIn, colIn, cmdIn, cmdKillIn, cmdIncl):
    self.cmdName = cmdNameIn
    self.textBox = 0
    self.row = rowIn
    self.col = colIn
    self.cmdStr = cmdIn
    self.nodesList = cmdKillIn
    self.inclInAll = cmdIncl
    self.started = False
    
  def command(self):
    print(self.cmdStr)
    if not self.started:
        currentDir = os.getcwd()
        nrcWsPath = os.path.join(os.path.expanduser("~"), 'projects/nrc_ws')
        os.chdir(nrcWsPath)
        os.system(self.cmdStr+" &")
        os.chdir(currentDir)
        self.started = True

  def killCmd(self):
    if (self.started):
      if (not self.nodesList):
        # Get nodes list from roslaunch file
        nodes = os.popen(self.cmdStr+" --nodes &").read()
        command = "rosnode kill"
        for row in nodes.split('\n'):
            node = row.rstrip('\n')
            command = command + " " + node[1:]

        print (command)
        os.system(command)
      else:
        # kill nodes based on list given
        print ("Rosnode kill nodes list : " + self.nodesList)
        os.system("rosnode kill "+self.nodesList)
      time.sleep(0.4)
      self.started = False
        
