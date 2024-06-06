#!/usr/bin/python

import rospy
import sys

from subsystem import Subsystem
from monitor import Monitor
from command import Command

from std_msgs.msg import *
from sensor_msgs.msg import *
from diagnostic_msgs.msg import *
from nrc_msgs.msg import *

def leadingSpaces(text_line):
  return len(text_line) - len(text_line.lstrip(' '))

def get_class( kls ):
  return globals()[kls]

def getMapName(text):
  mapName = 'Franklin.set'
  lines = text.split('\n')
  for line in lines:
    if 'Map' in line:
      mapName = line.split(': ')[1]
      return mapName

def read_subsystems(text, printDebug):
  subsystems = []
  lines = text.split('\n')
  current_subsystem = []
  current_monitor = Monitor("blank")
  current_command = Command("blank")
  
  # Parse text lines
  foundSubsystem = False
  mode = 'Init'
  for line in lines:

    if mode == 'Init':
      if 'Subsystem:' in line:
        foundSubsystem = True
    
    if foundSubsystem and leadingSpaces(line) == 2:
      subsystemName = line.rstrip(':').lstrip(' ')
      current_subsystem = Subsystem(subsystemName)
      current_monitor.good = -1
      if printDebug: print(" ")
      if printDebug: print("New Subsystem:",current_subsystem.name)
    
    if 'Trigger:' in line:
      mode = 'Trigger'
      if printDebug: print("==== Search for trigger ====")
    
    if 'HealthTopics:' in line:
      mode = 'HealthTopics'
      if printDebug: print("==== Search for health ====")
    
    elif 'Commands:' in line:
      mode = 'Commands'
      if printDebug: print("==== Search for commands ====")
      
    elif 'Diagnostic:' in line:
      mode = 'Diagnostic'
      if printDebug: print("==== Search for diagnostics ====")
      
    elif 'Depends:' in line:
      mode = 'Depends'
      if printDebug: print("==== Search for dependencies ====")
    
    if mode == 'Trigger':
      if '- Source:' in line:
        source = line.split(': ')[1]
        if 'Startup' in source:
          current_subsystem.trigger = 'Startup'
          current_subsystem.shouldBeStarted = 1
        elif 'StartRequest' in source:
          current_subsystem.trigger = 'StartRequest'
        elif 'PMU' in source:
          current_subsystem.trigger = 'PMU'
          triggerBit = source.split('PMU')[1].rstrip(' ')
          current_subsystem.triggerBit = int(triggerBit)
        elif 'ARD' in source:
          current_subsystem.trigger = 'ARD'
          triggerBit = source.split('ARD')[1].rstrip(' ')
          current_subsystem.triggerBit = int(triggerBit)
    
    if mode == 'HealthTopics':
      if '- HealthTopic:' in line:
        topic = line.split(': ')[1]
        current_monitor = Monitor(topic)
        
      elif 'HealthName:' in line:
        name = line.split(': ')[1]
        current_monitor.name = name
        
      elif 'HealthTopicType:' in line:
        topicType = line.split(': ')[1]
        current_monitor.topicType = get_class(topicType)
        
      elif 'NomWarnErrRate:' in line:
        rates = list(map(float, line.split(': ')[1].split(', ')))
        current_monitor.setRates(rates)
        current_subsystem.add_monitor(current_monitor, printDebug)
    
    if mode == 'Commands':
      if '- Name:' in line:
        name = line.split(': ')[1]
        current_command = Command(name)
        
      elif 'NodeName:' in line:
        name = line.split(': ')[1]
        current_command.nodeName = name
        
      elif 'Command:' in line:
        command = line.split(': ')[1]
        current_command.command = command

      elif 'LaunchTime:' in line:
        launch_time = line.split(': ')[1]
        current_command.launchTime = float(launch_time)
        current_subsystem.add_command(current_command, printDebug)
    
    if mode == 'Diagnostic':
      if 'LED' in line:
        idx = line.split(': ')[1]
        current_subsystem.ledIdx = int(idx)
        if printDebug: print('LED Index:',idx)
      elif 'Retry' in line:
        maxRetries = int(line.split(': ')[1])
        current_subsystem.maxRetries = maxRetries
        current_subsystem.startsRemaining = 1 + maxRetries
        if printDebug: print('maxRetries:',maxRetries)
      elif 'Timeout' in line:
        timeout = line.split(': ')[1]
        current_subsystem.timeout = float(timeout)
        if printDebug: print('timeout:',timeout)
    
    if mode == 'Depends':
      if 'Launch' in line:
        name = line.split(':')[1].lstrip(' ')
        current_subsystem.add_launch_depend(name)
        
      elif 'Run' in line:
        name = line.split(':')[1]
        current_subsystem.add_run_depend(name)
        subsystems.append(current_subsystem)
        current_subsystem = []

  return subsystems

def subscribe_health_msgs(subsystems):    
  for subsystem in subsystems:
    for m in subsystem.monitors:
      print("Subscribe: ", m.topic)
      rospy.Subscriber(m.topic, m.topicType, m.msgCallback, queue_size = 1)

def launch_subsystems(subsystems):    
  for subsystem in subsystems:
    print("Start subsystem:",subsystem.name)
    subsystem.start()
      
def stop_subsystems(subsystems):
  for subsystem in subsystems:
    subsystem.stop()
    #for c in subsystem.commands:
    #  print("Stopping: ", c.name)
    #  c.stop()
