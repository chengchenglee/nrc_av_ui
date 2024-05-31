#!/usr/bin/python

from monitor import Monitor
from command import Command

class Subsystem:
  def __init__(self, name):
    self.name = name
    self.commands = []
    self.monitors = []

  def add_command(self, command, printDebug):
    self.commands.append(command)
    if printDebug: print("Add command",len(self.commands),":", command.name)

  def add_monitor(self, monitor, printDebug):
    self.monitors.append(monitor)
    if printDebug: print("Add monitor",len(self.monitors),":", monitor.name, monitor.topic, monitor.good, monitor.failing, monitor.failed)
