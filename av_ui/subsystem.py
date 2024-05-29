#!/usr/bin/python

from monitor import Monitor
from command import Command

class Subsystem:
  def __init__(self, name):
    self.name = name
    self.commands = []
    self.monitors = []

  def add_command(self, command):
    self.commands.append(command)
    print("Add command: ", command.name)

  def add_monitor(self, monitor):
    self.monitors.append(monitor)
    print("Add monitor:", monitor.name, monitor.topic, monitor.good, monitor.failing, monitor.failed)
