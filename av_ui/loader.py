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

def read_subsystems(text, printDebug):
  print("av_ui parse subsystems, printDebug = ", printDebug)
  subsystems = []
  lines = text.split('\n')
  current_subsystem = []
  current_monitor = Monitor("blank")
  current_command = Command("blank")
  
  # Parse text lines
  foundSubsystem = False
  mode = 'Init'
  for line in lines:
    #print(line)
    
    if mode == 'Init':
      if 'Subsystem:' in line:
        foundSubsystem = True
    
    if foundSubsystem and leadingSpaces(line) == 2:
      subsystemName = line.rstrip(':').lstrip(' ')
      current_subsystem = Subsystem(subsystemName)
      current_monitor.good = -1
      if printDebug: print(" ")
      if printDebug: print("New Subsystem:",current_subsystem.name)
      mode = 'Health Topics'
      if printDebug: print("==== Search for health ====")
    
    if mode == 'Health Topics':
      if 'Commands:' in line:
        mode = 'Commands'
        if printDebug: print("==== Search for commands ====")
        
      elif '- HealthTopic:' in line:
        topic = line.split(': ')[1]
        current_monitor = Monitor(topic)
        
      elif 'HealthName:' in line:
        name = line.split(': ')[1]
        current_monitor.name = name
        
      elif 'HealthTopicType:' in line:
        topicType = line.split(': ')[1]
        if printDebug: print(topicType)
        current_monitor.topicType = get_class(topicType)
        
      elif 'NomWarnErrRate:' in line:
        rates = list(map(float, line.split(': ')[1].split(', ')))
        current_monitor.setRates(rates)
        current_subsystem.add_monitor(current_monitor, printDebug)
    
    if mode == 'Commands':
      if 'Depends' in line:
        mode = 'Depends'
        if printDebug: print("==== Search for dependencies ====")
    
      elif '- Name:' in line:
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
        current_command.launchTime = launch_time
        current_subsystem.add_command(current_command, printDebug)
    
    if mode == 'Depends':
      if 'Launch' in line:
        print(line)
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
