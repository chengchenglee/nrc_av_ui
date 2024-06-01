#!/usr/bin/env python

import rospy
import subprocess
import shlex
import sys
import signal
import psutil

def kill_child_processes(parent_pid, sig=signal.SIGTERM):
  try:
    parent = psutil.Process(parent_pid)
    print(parent)
  except psutil.NoSuchProcess:
    print("parent process not existing")
    return
  children = []
  try:
    # Ubuntu 14.04?
    children = parent.get_children(recursive=True)
  except:
    # Ubuntu 18.04?
    children = parent.children(recursive=True)
  print(children)
  for process in children:
    print("try to stop child process: " + str(process))
    process.send_signal(sig)
    
class Roscore(object):
  __initialized = False
  def __init__(self):
    if Roscore.__initialized:
      raise Exception("You can't create more than 1 instance of Roscore.")
    Roscore.__initialized = True
  def run(self):
    try:
      self.roscore_process = subprocess.Popen(['roscore'])
      self.roscore_pid = self.roscore_process.pid
    except OSError as e:
      sys.stderr.write('roscore could not be run')
      raise e
  
  def listPids(self):
    print("List pids.")
    try:
      parent = psutil.Process(self.roscore_pid)
    except psutil.NoSuchProcess:
      return
    children = []
    try:
      children = parent.children(recursive=True)
      print("Current pids:", children)
    except:
      a = 1
    
  def terminate(self):
    print("try to stop pids of roscore pid: " + str(self.roscore_pid))
    kill_child_processes(self.roscore_pid)
    self.roscore_process.terminate()
    self.roscore_process.wait()  # important to prevent from zombie process
    Roscore.__initialized = False
