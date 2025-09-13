28#!/usr/bin/python

import rospy
import sys
import yaml
from typing import Dict, Any, List

from include.subsystem import Subsystem
from include.monitor import Monitor
from include.command import Command

from std_msgs.msg import *
from sensor_msgs.msg import *
from diagnostic_msgs.msg import *
from nrc_msgs.msg import *

def leadingSpaces(text_line):
  return len(text_line) - len(text_line.lstrip(' '))

def get_class( kls ):
  return globals()[kls]

def getField(text,field,default):

  value = default
  lines = text.split('\n')
  for line in lines:
    if field in line:
      value = line.split(': ')[1]
  print ("Loader param: ",field," ==> ",value)
  return value

def getSubConfigs(text, config):
  params = {}
  config_indent = -1
  config_found = False
  lines = text.split('\n')
  for line in lines:
    if not line or line.startswith('#'):
      continue
    indent = len(line) - len(line.lstrip())
    # print(rosparams_found, indent)
    if config in line:
      config_found = True
      config_indent = indent
      continue

    if config_found and indent == config_indent:
      config_found = False
    
    if config_found and indent > config_indent:
      # print(line)
      key, value = line.split(':')
      key = key.strip()
      value = value.strip() if value else None
      if key:
        params[key] = value
  return params

def getCloudConfig(text):
  configInfo = {
    'MQTT_SERVER': '127.0.0.1',
    'MQTT_PORT': 1883,
    'MQTT_USER': 'poza',
    'MQTT_PASSWORD': 'fvla',
  }
  keys = configInfo.keys()
  lines = text.split('\n')
  for line in lines:
    for key in keys:
      if key in line:
        value = line.split(': ')[1]
        configInfo[key] = value
  
  return configInfo

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
        if not idx == '':
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


# def extract_machines_block(text):
#   lines = text.split('\n')
#   machines_block = []
#   capture = False

#   if lines:
#     for line in lines:
#       if line.strip() == 'Machines:':
#         machines_block.append(line)
#         capture = True
#       elif capture:
#         # Stop if we hit an empty line 
#         if line.strip() == '':
#           break
#         if capture:
#           machines_block.append(line)
    
#   return '\n'.join(machines_block)


# def read_machine_definitions(text, printDebug):
#   machine_defs = []

#   machines_block = yaml.safe_load(extract_machines_block(text))
#   if machines_block:
#     for name, props in machines_block.get("Machines", {}).items():
#       address = props.get("address", "")
#       env_loader = props.get("env-loader")
#       if env_loader:
#         machine_defs.append(f'<machine name="{name}" address="{address}" env-loader="{env_loader}" />')
#       else:
#         machine_defs.append(f'<machine name="{name}" address="{address}" />')

#   if printDebug: print('machine_defs:', machine_defs)
#   return machine_defs


def read_vehicletype_machine_defs(yaml_content: str) -> List[str]:
    """
    Convert the Machines section from YAML to a list of XML machine definitions.
    
    Args:
        yaml_content (str): The entire YAML content as a string
        
    Returns:
        List[str]: List of XML formatted machine definitions
    """
    try:
        # Parse YAML content
        yaml_data = yaml.safe_load(yaml_content)
        
        # Check if Machines section exists
        if not yaml_data or 'Machines' not in yaml_data:
            return []
        
        xml_lines = []
        
        # Convert each machine entry to XML format
        for machine_name, machine_info in yaml_data['Machines'].items():
            # Start with required attributes
            attributes = [
                f'name="{machine_name}"',
                f'address="{machine_info["address"]}"'
            ]
            
            # Add env-loader if it exists and is not empty
            if machine_info.get("env-loader"):
                attributes.append(f'env-loader="{machine_info["env-loader"]}"')
            
            # Create XML tag
            xml_line = f'<machine {" ".join(attributes)} />'
            xml_lines.append(xml_line)
        
        return xml_lines
    
    except yaml.YAMLError as e:
        return [f"Error parsing YAML: {str(e)}"]
    except Exception as e:
        return [f"Error processing content: {str(e)}"]



def read_vehicletype_default_arguments(yaml_content: str) -> List[str]:
    """
    Extract the default_arguments block from YAML text and convert to XML-style argument list.
    
    Args:
        yaml_content (str): The content of the YAML file
        
    Returns:
        List[str]: List of XML-style argument strings, or empty list if not found
    """
    try:
        # Parse the YAML text
        yaml_data = yaml.safe_load(yaml_content)
        
        # Check if default_arguments exists
        if not yaml_data or 'default_arguments' not in yaml_data:
            return []
        
        # Convert each key-value pair to XML-style argument
        args_list = []
        for key, value in yaml_data['default_arguments'].items():
            # Convert boolean values to lowercase strings
            if isinstance(value, bool):
                value = str(value).lower()
            # Convert all other values to strings
            else:
                value = str(value)
            
            # Create XML-style argument string
            arg_str = f'<arg name="{key}" value="{value}"/>'
            args_list.append(arg_str)
            
        return args_list
        
    except yaml.YAMLError as e:
        print(f"Error parsing YAML: {e}")
        return []
    

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
