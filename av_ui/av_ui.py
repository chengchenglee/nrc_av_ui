#!/usr/bin/python

from subsystem import Subsystem
from monitor import Monitor
from command import Command
import re
import time
from math import exp

def leadingSpaces(text_line):
  return len(text_line) - len(text_line.lstrip(' '))

def parse_subsystems(text):
  print("Parse subsystems.")
  subsystems = []
  #subsystem_data = text.split('\n\n')

  #for subsystem_text in subsystem_data:
  lines = text.split('\n')
    #subsystem_name = re.search(r'Subsystem \d+', lines[0]).group()
  current_subsystem = []
  current_monitor = Monitor("blank")
  current_command = Command("blank")
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
      print(" ")
      #print("New Subsystem:",current_subsystem.name)
      mode = 'Health Topics'
      print("==== Search for health ====")
    
    if mode == 'Health Topics':
      if 'Commands:' in line:
        mode = 'Commands'
        print("==== Search for commands ====")
        
      elif '- HealthTopic:' in line:
        topic = line.split(': ')[1]
        current_monitor = Monitor(topic)
      elif 'HealthName:' in line:
        name = line.split(': ')[1]
        current_monitor.name = name
      elif 'HealthTopicType:' in line:
        topic = line.split(': ')[1]
        current_monitor.topic = topic
      elif 'NomWarnErrRate:' in line:
        rates = list(map(float, line.split(': ')[1].split(', ')))
        current_monitor.setRates(rates)
        current_subsystem.add_monitor(current_monitor)
    
    if mode == 'Commands':
      if 'Depends' in line:
        subsystems.append(current_subsystem)
    
      elif '- Name:' in line:
        name = line.split(': ')[1]
        current_command.name = name
        #print(name)
      elif 'Command:' in line:
        command = line.split(': ')[1]
        current_command.command = command
        #print(command)
      elif 'LaunchTime:' in line:
        launch_time = line.split(': ')[1]
        current_command.launchTime = launch_time
        #print(launch_time)
        current_subsystem.add_command(current_command)
        

  return subsystems

#def interfaceHealth(agent_name, ping_machines, sensors_list, algs_list, cmd_list, dest_list = [], multi_dest_list = []):

text = []
with open('foxtrot_config.yaml', 'r') as file:
  text = file.read()
subsystems = parse_subsystems(text)

#for subsystem in subsystems:
  #print("Subsystem Name: {subsystem.name}")
  #print("Commands:", subsystem.commands)
    
  #for monitor in subsystem.monitors:
    #print("Monitor Topic: {monitor.topic}, Rates: Good: {monitor.good}, Failing: {monitor.failing}, Failed: {monitor.failed}")
    #print("Average Message Rate: {monitor.average_message_rate}, Time Since Last Received: {monitor.time_since_last_received}")
    
# Start roscore 
#roscore = Roscore()
#roscore.run()

# Main function starts here
#rospy.init_node('listener', anonymous=True)
    
#while (running and (not rospy.is_shutdown())):
#  a = 1
