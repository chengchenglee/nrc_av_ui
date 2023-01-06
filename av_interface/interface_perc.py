#!/usr/bin/python

# terminal commands
import os
import sys
import psutil

# button callbacks
from functools import partial

# Ros  Messages
import rospy
from rosgraph_msgs.msg import *
import time
from sensor_msgs.msg import *
from std_msgs.msg import *
from diagnostic_msgs.msg import *
from geometry_msgs.msg import *
from nrc_msgs.msg import *
from sensor_msgs.msg import NavSatFix

import imp
found = False
try:
    from j2735_msgs.msg import * 
except ImportError:
    print("j2735 msgs not found.")

try:
    from velodyne_msgs.msg import *
except:
    print("velodyne msgs not found.")

# sensor_image to openCv
import numpy
import cv2
from cv_bridge import CvBridge, CvBridgeError

# Ping
import os
import subprocess
import signal
import multiprocessing

# Gui
import Tkinter
import ttk
from PIL import Image

if sys.version_info[0] == 3:
  # er, maybe we already got that above ...
  from Tkinter import messagebox
else:
  import tkMessageBox # python 2.7 flavor

def s2j(str):
  return "\"" + str + "\""

# AILSV Classes
from RoscoreObj import *
from RosMsgMonitor import *
from ComputerStatsMonitor import *
from RosCmd import *
from SetDest import *
from MultiSetDest import *
from CsvWriter import *

# Global and startup params
running = True
stack_active = False # set to True when commands are launched - Stop ALL can set it to False again 
speakerIsMuted = True
goodBeepIsMuted = False
autostart = False
autorecord = False


def create_window(dataIn):
    if "tower_cam" in dataIn.topicName:
      cmd = "rosrun image_view image_view image:=" + dataIn.topicName + " _image_transport:=compressed &"
      print(cmd)
      os.system(cmd)
      
def on_closing():
  global running
  print "On closing"
  #if messagebox.askokcancel("Quit","Do you want to quit?"):
  running = False
  
def startAll():
  print "Starting all"
  global CmdList, stack_active
  stack_active = True
  for cmd in CmdList:
    if (not cmd.cmdName == "ALL"  and cmd.inclInAll == True):
      # Run the specified command
      cmd.command()
      time.sleep(1.0)
  
def stopAll():
  print "Stopping all"
  global CmdList, stack_active
  
  # Get nodes list from roslaunch file
  nodes = os.popen("rosnode list").read()
  command = "rosnode kill"
  #numNodes = 0
  #for row in nodes.split('\n'):
  #  node = row.rstrip('\n')
  #  if (node[1:] != "rosout"):
  #    command = command + " " + node[1:]
  #    numNodes = numNodes + 1

  #if (numNodes > 0):
  #  print command    
  #  os.system(command)

  for cmd in CmdList:
    if (not cmd.cmdName == "ALL"):
      # Run the specified kill command
      cmd.killCmd()
  stack_active = False


def startRecord(record_cmd):
    currentDir = os.getcwd()
    nrcWsPath = os.path.join(os.path.expanduser("~"), 'projects/nrc_ws')
    os.chdir(nrcWsPath)
    record_cmd_bg = record_cmd + " &"
    os.system(record_cmd_bg)
    #os.system("roslaunch nrc_svcs record_separately_xe0.launch &")
    os.chdir(currentDir)
  
def stopRecord(record_cmd):
    arg = record_cmd + " --nodes &"
    nodes = os.popen(arg).read()
    #nodes = os.popen("roslaunch nrc_svcs record_separately_xe0.launch --nodes &").read()
    command = "rosnode kill"
    for row in nodes.split('\n'):
      node = row.rstrip('\n')
      command = command + " " + node[1:]

    os.system(command)

def bye():
  global running
  running = False


def runROS():
  print "runROS"


def interfaceHealth(name, ping_machines, sensors_list, algs_list, cmd_list, record_cmd, mode):
  global running

# List of computers to ping
  CompList = []
  xpos = 0
  ypos = 0
  for e in ping_machines:

    what = e["name"]
    addr = e["addr"]
  
    CompList.append(ComputerStatsMonitor(what,addr,xpos,ypos,""))
    ypos = ypos + 1
    if ypos > 6:
      xpos = xpos + 1
      ypos = 0

# List of sensors to report
  SensorList = []
  xpos = 0
  ypos = 0
  for e in sensors_list:

    what      = e["name"]
    eRate     = e["errRate"]
    wRate     = e["warnRate"]
    topicName = e["topicName"]
    topicType = e["topicType"]
  
    SensorList.append(RosMsgMonitor(what,eRate,wRate,xpos,ypos,topicName,topicType))
    ypos = ypos + 1
    if ypos > 6:
      xpos = xpos + 1
      ypos = 0

# List of algs to report
  AlgList = []
  xpos = 0
  ypos = 0
  for e in algs_list:

    what      = e["name"]
    eRate     = e["errRate"]
    wRate     = e["warnRate"]
    topicName = e["topicName"]
    topicType = e["topicType"]
  
    AlgList.append(RosMsgMonitor(what,eRate,wRate,xpos,ypos,topicName,topicType))
    ypos = ypos + 1
    if ypos > 6:
      xpos = xpos + 1
      ypos = 0

# List of commands to offer
  global CmdList
  global autostart, autorecord
  numCmds = 0
  CmdList = []
  xpos = 0
  ypos = 0
  for e in cmd_list:

    nameIn    = e["name"]
    command   = e["command"]
    killNodes = []
    inclByDefault = []
    
    try:
      killNodes = e["nodes"]
    except:
      #Do nothing
      a = 1
      
    try:
      inclByDefault = e["inclByDef"]
    except:
      inclByDefault = True
    
    if nameIn == "ALL":
      try:
        autostart = e["autoStart"]
      except:
        autostart = False
      
      if autostart:
        try:
          autorecord = e["autoRecord"]
        except:
          autorecord = False

    CmdList.append(RosCmd(nameIn,xpos,ypos,command,killNodes, inclByDefault))
    xpos = xpos + 1
    numCmds = numCmds + 1
    
    
  # Setup window dimensions and title
  window = Tkinter.Tk(className='ailsvwindow')
  window.title(name)
  window.geometry('515x485')
  window.protocol("WM_DELETE_WINDOW", on_closing)

# Frame row def'n
  modeSectionTitleRow = 1
  modeSectionRow = modeSectionTitleRow + 1
  launchAllSectionTitleRow = modeSectionRow + 1
  launchAllSectionRow = launchAllSectionTitleRow + 1
  computerSectionTitleRow = launchAllSectionRow + 1
  computerSectionRow = computerSectionTitleRow + 1
  sensorsSectionTitleRow = computerSectionRow + 1
  sensorsSectionRow = sensorsSectionTitleRow + 1
  percSectionTitleRow = sensorsSectionRow + 1
  percSectionRow = percSectionTitleRow + 1
  processSectionTitleRow = percSectionRow + 1
  processSectionRow = processSectionTitleRow + 1
  textSectionTitleRow = processSectionRow + 1
  textSectionRow = textSectionTitleRow + 1

# Tab def
  tab_control = ttk.Notebook(window)
  tab1 = Tkinter.Frame(tab_control)
  tab2 = Tkinter.Frame(tab_control)
  tab_control.add(tab1, text='Status')
  tab_control.add(tab2, text='Commands')
  tab_control.pack(expand=1, fill='both')

  buttonWidth = 7

# Frame def
  lbl_mode = Tkinter.Label(tab1, text="Mode: " + mode.upper(), font='bold')
  lbl_mode.grid(row=modeSectionTitleRow, stick=Tkinter.W)
  #modeFrame = Tkinter.Frame(tab1, width=400, height=50)
  #modeFrame.grid(row=modeSectionRow,columnspan=10, sticky=Tkinter.W)

  lbl_all = Tkinter.Label(tab1, text="System Launch")
  lbl_all.grid(row=launchAllSectionTitleRow, stick=Tkinter.W)
  allLaunchFrame = Tkinter.Frame(tab1, width=400, height=50)
  allLaunchFrame.grid(row=launchAllSectionRow,columnspan=10, sticky=Tkinter.W)

  lbl_comp = Tkinter.Label(tab1, text="Ping Status")
  lbl_comp.grid(row=computerSectionTitleRow, sticky=Tkinter.W)
  compFrame = Tkinter.Frame(tab1, width=400, height=50)
  compFrame.grid(row=computerSectionRow,columnspan=10, sticky=Tkinter.W)

  lbl_sens = Tkinter.Label(tab1, text="Sensor Status")
  lbl_sens.grid(row=sensorsSectionTitleRow, sticky=Tkinter.W)
  sensFrame = Tkinter.Frame(tab1, width=400, height=50)
  sensFrame.grid(row=sensorsSectionRow,columnspan=10, sticky=Tkinter.W)

  lbl_alg = Tkinter.Label(tab1, text="Algorithm Status")
  lbl_alg.grid(row=percSectionTitleRow, sticky=Tkinter.W)
  algFrame = Tkinter.Frame(tab1, width=400, height=50)
  algFrame.grid(row=percSectionRow,columnspan=10, sticky=Tkinter.W)

  lbl_text = Tkinter.Label(tab1, text="Text Status")
  lbl_text.grid(row=textSectionTitleRow, sticky=Tkinter.W)
  textFrame = Tkinter.Frame(tab1, width=400, height=50)
  textFrame.grid(row=textSectionRow,columnspan=10, sticky=Tkinter.W)

  lbl_cmd = Tkinter.Label(tab2, text="Send Command")
  lbl_cmd.grid(row=1, sticky=Tkinter.W)
  cmdFrame = Tkinter.Frame(tab2, width=400, height=50)
  cmdFrame.grid(row=2,columnspan=10, sticky=Tkinter.W)
  
  vehValTitleRow = 1;
  vehValButtonsRow = vehValTitleRow + 1
  drvValTitleRow = vehValButtonsRow + 1
  drvValButtonsRow = drvValTitleRow + 1
  
# Create Mode section
  #rv = Tkinter.IntVar(modeFrame, 1)
  #modeButton1 = Tkinter.Radiobutton(modeFrame, text="Live Data", var=rv, value=1, command=setModeLiveData, padx=20)
  #modeButton1.grid(column=1, row=1, sticky=Tkinter.W+Tkinter.E)
  
  #modeButton2 = Tkinter.Radiobutton(modeFrame, text="Recorded Bagfile Data", var=rv, value=2, command=setModeRecordedBagfileData, padx=20)
  #modeButton2.grid(column=2, row=1, sticky=Tkinter.W+Tkinter.E)
  
# Create "Launch All" buttons - Note, apparently we only use the 'button' variable on the next line and then it is ignored.
  button1 = Tkinter.Button(allLaunchFrame, text="Launch ALL", width=buttonWidth*2, padx=1, relief="raised",command=startAll)
  button1.grid(column=1, row=1, sticky=Tkinter.W+Tkinter.E)

  button2 = Tkinter.Button(allLaunchFrame, text="Stop ALL", width=buttonWidth*2, padx=1, relief="raised",command=stopAll)
  button2.grid(column=2, row=1, sticky=Tkinter.W+Tkinter.E)
  
  button1 = Tkinter.Button(allLaunchFrame, text="Start Record", width=buttonWidth*2, padx=1, relief="raised",command= lambda : startRecord(record_cmd))
  button1.grid(column=1, row=2, sticky=Tkinter.W+Tkinter.E)

  button2 = Tkinter.Button(allLaunchFrame, text="Stop Record", width=buttonWidth*2, padx=1, relief="raised",command= lambda : stopRecord(record_cmd))
  button2.grid(column=2, row=2, sticky=Tkinter.W+Tkinter.E)

  button4 = Tkinter.Button(allLaunchFrame, text="Exit", width=buttonWidth*2, padx=1, relief="raised",command=bye)
  button4.grid(column=3, row=1, sticky=Tkinter.W+Tkinter.E)

# Create status indicators
  for c in CompList:
    c.label = Tkinter.Button(compFrame, text=c.labelName, width=buttonWidth, padx=1, relief="raised", bg="pink", command=c.displayMore)
    c.label.grid(column=c.col, row=c.row, sticky=Tkinter.W+Tkinter.E)
  
  for s in SensorList:
    s.label = Tkinter.Button(sensFrame, text=s.labelName, width=buttonWidth, padx=1, relief="raised", bg="pink", command=s.displayMore)
    s.label.grid(column=s.col, row=s.row, sticky=Tkinter.W+Tkinter.E)
  
  for a in AlgList:
    a.label = Tkinter.Button(algFrame, text=a.labelName, width=buttonWidth, padx=1, relief="raised", bg="pink", command=a.displayMore)
    a.label.grid(column=a.col, row=a.row, sticky=Tkinter.W+Tkinter.E)
  
  textBox = Tkinter.Message(textFrame, text="Init", padx=1, width=500, relief="raised", bg="white", anchor=Tkinter.W)
  textBox.grid(column=0, row=0, columnspan=10)

  commandWidth = 20
  for c in CmdList:
    if c.cmdName == "ALL":
      lbl_c = Tkinter.Label(cmdFrame, text=c.cmdName)
      lbl_c.grid(column=1, row=c.row, sticky=Tkinter.W+Tkinter.E)
      c.label = Tkinter.Button(cmdFrame, text="Start", width=commandWidth, padx=1, relief="raised", command=startAll)
      c.label.grid(column=2, row=c.row, sticky=Tkinter.W+Tkinter.E)
      c.label = Tkinter.Button(cmdFrame, text="Stop", width=commandWidth, padx=1, relief="raised", command=stopAll)
      c.label.grid(column=3, row=c.row, sticky=Tkinter.W+Tkinter.E)
    else:
      lbl_c = Tkinter.Label(cmdFrame, text=c.cmdName)
      lbl_c.grid(column=1, row=c.row, sticky=Tkinter.W+Tkinter.E)
      c.label = Tkinter.Button(cmdFrame, text="Start", width=commandWidth, padx=1, relief="raised", command=c.command)
      c.label.grid(column=2, row=c.row, sticky=Tkinter.W+Tkinter.E)
      c.label = Tkinter.Button(cmdFrame, text="Stop", width=commandWidth, padx=1, relief="raised", command=c.killCmd)
      c.label.grid(column=3, row=c.row, sticky=Tkinter.W+Tkinter.E)


  # Start roscore 
  roscore = Roscore()
  roscore.run()

  # Main function starts here
  rospy.init_node('listener', anonymous=True)

  # Subscribers
  for c in CompList:
    if c.rosMsgName:
      rospy.Subscriber(''.join(c.rosMsgName+"_cpu_stats"), Int32MultiArray, c.cpuStatsCallback, queue_size = 1)
      rospy.Subscriber(''.join(c.rosMsgName+"_cpu_temp"), Float32, c.cpuTempCallback, queue_size = 1)
      rospy.Subscriber(''.join(c.rosMsgName+"_cpu_net"), Float32, c.cpuTempCallback, queue_size = 1)
  
  for s in SensorList:
    if s.labelName == "GPSConv" or s.labelName == "GPS":
      rospy.Subscriber(s.topicName, s.topicType, s.statusMsgCallback, queue_size = 1)
    else:
      if "cam" in s.topicName:
        rospy.Subscriber(''.join(s.topicName+"/health_status"), s.topicType, s.msgCallback, queue_size = 1)
      else:
        rospy.Subscriber(s.topicName, s.topicType, s.msgCallback, queue_size = 1)
  
  for a in AlgList:
    if a.labelName == "TrajP" or a.labelName == "TrajC":
      rospy.Subscriber(a.topicName, a.topicType, a.statusMsgCallback, queue_size = 1)
    else:
      rospy.Subscriber(a.topicName, a.topicType, a.msgCallback, queue_size = 1)
  
  avStatusPub = rospy.Publisher("ailsv_av_status",InterventionRequest,queue_size=1)

  csvWriter = CsvWriter()
  csvWriter.openCsv()
  
  pingTimer = 0
  pingOrder = 0
  csvTimer = 0
  engaged = 0
  currentDist = 0
  engagedStartDist = 0
  
  # Setup rosparams - pass in runtime options here
  os.system("rosrun nrc_svcs paramsForDriving.sh")
  
  if mode == "live":
    print "Live data mode"
    os.system("rosparam set use_sim_time false")
  else:
    print "Bagfile data mode"
    os.system("rosparam set use_sim_time true")
    
  
  running = True;
  nextBeepTime = rospy.Time.now().to_sec()
  rapidBeepCount = 0
  hddBeepOn = False
  
  # Autostart and autorecord timing
  autostartTime = rospy.Time.now().to_sec()
  autorecordTime = autostartTime
  if autostart:
    autostartTime = autostartTime + 5.0
  
  if autorecord:
    autorecordTime = autostartTime + 60.0
  
  while (running and (not rospy.is_shutdown())):
  
    currentTime = rospy.Time.now().to_sec()
    if autostart and currentTime > autostartTime:
      print "Autostarting ALL"
      autostart = False
      #speakerIsMuted = False
      #goodBeepIsMuted = False
      startAll()
      
    if autorecord and currentTime > autorecordTime:
      print "Starting autoRecord"
      autorecord = False
      startRecord(record_cmd)
  
    msgText = []
    #jsonText = "{"
    jsonText = ""
    jsonCount = 0
    
    severity = 0;
  
    for c in CompList:
      c.getcolor(c.label,severity)
      if c.displayText == 1 or c.autoText == 1:
        msgText +=c.labelName+": "+c.msgText+'\n'
        if jsonCount > 0:
  	  jsonText += ","
          jsonText += c.jsonText
          jsonCount += 1
      
    # Update sensor status
    errorBeep = False
    for s in SensorList:
      s.getcolor(s.label,severity)
      errorBeep = errorBeep or s.reqErrorBeep
      if s.displayText == 1 or s.autoText == 1:
        msgText +=s.labelName+": "+s.msgText+'\n'
        if jsonCount > 0:
          jsonText += ","
          jsonText += s.jsonText
          jsonCount += 1
      csvWriter.updateData(s)
    
    # Update alg status
    for a in AlgList:
      a.getcolor(a.label,severity)
      if a.displayText == 1 or a.autoText == 1:
        msgText +=a.labelName+": "+a.msgText+'\n'
        if jsonCount > 0:
  	  jsonText += ","
          jsonText += a.jsonText
          jsonCount += 1
    
    if (msgText==[]):
      msgText = "No status messages to display"
    
    textBox.configure(text=''.join(msgText))
    
    # Finish json-formatted status
    jsonText = "[" + jsonText + "]"
    avStatusMsg = InterventionRequest()
    avStatusMsg.severity = severity
    avStatusMsg.solution = jsonText
    avStatusPub.publish(avStatusMsg)
    
    # Ping computers
    if pingTimer > 10:
      pingTimer = 0
      counter = 0
      for computer in CompList:
        if counter == pingOrder or counter == pingOrder+1 or computer.ping == 0:
          computer.check_ping()
        counter = counter + 1  
      pingOrder = pingOrder + 2
      if pingOrder + 1 > counter:
        pingOrder = 0
      
      # Check hd space
      hdd = psutil.disk_usage('/')
      
      minHddSpace = 50
      if (hdd.free / (2**30)) < minHddSpace:
        print ('Warning: remaining HDD space is less than ' + str(minHddSpace) + ' GB.')
        hddBeepOn = True
      else:
        hddBeepOn = False
    errorBeep = errorBeep or hddBeepOn
    
    csvWriter.checkWriteCsv(False)
    
    pingTimer = pingTimer + 1
    csvTimer = csvTimer + 1
    
    # Update gui
    if running:
      window.update_idletasks()
      window.update()
    
    
    # Wait for updates
    time.sleep(0.1)
          
    
  # End rospy
  print("Closing interface monitor")

  window.quit()
  csvWriter.checkWriteCsv(True)
  stopAll()
  time.sleep(0.5)
  roscore.terminate()
  
  #killall -9 roscore
  #killall -9 rosmaster
  #killall -9 rosout

#interfaceHealth()

