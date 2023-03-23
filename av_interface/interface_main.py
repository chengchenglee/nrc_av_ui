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
    from cda_msgs.msg import *
except ImportError:
    print("cda msgs not found.")

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
if sys.version_info[0] < 3:
  import Tkinter
  import tkMessageBox # python 2.7 flavor
  import ttk
else: # 3+
  if sys.version_info[1] < 6:
    import Tkinter # <3.6
    import ttk
  else:
    import tkinter as Tkinter # 3.6
    import tkinter.ttk as ttk

from PIL import Image

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
from SetConfig import *

# Global and startup params
running = True
stack_active = False # set to True when commands are launched - Stop ALL can set it to False again 
speakerIsMuted = True
goodBeepIsMuted = False
autostart = False
autorecord = False

#
# Put all valid maps for this branch here (or somewhere more conspicuous?)
# One could call a special function in metric map manager get all supported names?
global map_name
map_name = 'Sanborn2019MMv24' # pick a default
# names to pass to >>paramsForMap.sh<<, notice we leave out here map
map_options = ['Sanborn2019MMv24','Sanborn2020PNHv2','MiniMap','SC_Cached','SanMiguel_Cached','Noe.set','Franklin.set','THill_Cached']

def create_window(dataIn):
    if "tower_cam" in dataIn.topicName:
      cmd = "rosrun image_view image_view image:=" + dataIn.topicName + " _image_transport:=compressed &"
      print(cmd)
      os.system(cmd)
      
def on_closing():
  global running
  print ("On closing")
  #if messagebox.askokcancel("Quit","Do you want to quit?"):
  running = False
  
def startAll():
  print ("Starting all")
  global CmdList, stack_active
  stack_active = True
  for cmd in CmdList:
    if (not cmd.cmdName == "ALL"  and cmd.inclInAll == True):
      # Run the specified command
      cmd.command()
      time.sleep(1.0)
  
def stopAll():
  print ("Stopping all")
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

def muteSpeaker():
    global speakerIsMuted;
    
    if speakerIsMuted:
      print ("Speaker is not muted.")
      speakerIsMuted = False
    else:
      print ("Speaker is muted.")
      speakerIsMuted = True
      
def muteGoodSpeaker():
    global goodBeepIsMuted;
    
    if goodBeepIsMuted:
      print ("Good beep is not muted.")
      goodBeepIsMuted = False
    else:
      print ("Good beep is muted.")
      goodBeepIsMuted = True
  

def startRecord():
    currentDir = os.getcwd()
    nrcWsPath = os.path.join(os.path.expanduser("~"), 'projects/nrc_ws')
    os.chdir(nrcWsPath)
    os.system("roslaunch nrc_svcs record_pnh.launch &")
    os.chdir(currentDir)
  
def stopRecord():
    nodes = os.popen("roslaunch nrc_svcs record_pnh.launch --nodes &").read()
    command = "rosnode kill"
    for row in nodes.split('\n'):
      node = row.rstrip('\n')
      command = command + " " + node[1:]

    os.system(command)

def bye():
  global running
  running = False
  
def demoConfig():
    setDemoConfig();
    
def expConfig():
    setExpConfig();

def updateMap(newName):
  global map_name, stack_active, mapsel
  if stack_active:
    mapsel.set(map_name) # set it back
    title='No map change while running'
    msg  ='Sorry Charlie - shut things down before changing the map'
    if sys.version_info[0] == 3:
      messagebox.showinfo(title, msg)
    else:
      tkMessageBox.showinfo(title, msg)
  else:
    map_name = newName
    print ('New map name selected is ',map_name)
    #os.system("rosrun nrc_svcs paramsForMap.sh "+map_name)

def retrieve_valInput():
  global valSpdTextbox
  global valStrTextbox
  global valAccelTextbox
  global valStrAngleTextbox
  
  inputValue1=valSpdTextbox.get()
  inputValue2=valStrTextbox.get()
  inputValue3=valAccelTextbox.get()
  inputValue4=valStrAngleTextbox.get()
  return float(inputValue1), float(inputValue2), float(inputValue3), float(inputValue4)

def retrieve_valTypeInput():
    global valSpdSelect
    global valStrSelect
    
    inputValue1=valSpdSelect.get()
    inputValue2=valStrSelect.get()
    return inputValue1, inputValue2

def sendValCmd(arg):
    
  msg = FailureModeRequest()
  msg.failure_mode_type = arg;
  
  msg.target_speed = float(0.)
  msg.lateral_acceleration = float(0.)
  msg.target_acceleration = float(0.)
  msg.steering_angle = float(0.)
  
  msg.use_target_speed = False
  msg.use_lateral_acceleration = False
  msg.use_target_acceleration = False
  msg.use_steering_angle = False
  
  msg.teleop_filename = ""
  
  if arg == FailureModeRequest.TYPE_RESET_OVERRIDE:
    print("Ovr reset!")
  elif arg == FailureModeRequest.TYPE_GO_OVERRIDE:
    
    targetSpeed, lateralAcceleration, targetAccel, steeringAngle = retrieve_valInput()
    spdSelect, strSelect = retrieve_valTypeInput()

    printGOparams = "Ovr go!    "
    if spdSelect == "Tgt Speed (kph)":
        msg.use_target_speed = True
        printGOparams += spdSelect + ": " + str(targetSpeed)
    elif spdSelect == "Tgt Accel (m/s2)":
        msg.use_target_acceleration = True
        printGOparams += spdSelect + ": " + str(targetAccel)
    
    if strSelect == "Tgt Lat G (G)":
        msg.use_lateral_acceleration = True
        printGOparams += " " + strSelect + ": " + str(lateralAcceleration)
    elif strSelect == "Tgt Steering (deg)":
        msg.use_steering_angle = True
        printGOparams += " " + strSelect + ": " + str(steeringAngle)
    
    msg.target_speed = targetSpeed
    msg.lateral_acceleration = lateralAcceleration
    msg.target_acceleration = targetAccel
    msg.steering_angle = steeringAngle
    
    print (printGOparams)
    
  elif arg == FailureModeRequest.TYPE_STOP_OVERRIDE:
    print("Ovr stop!")
  elif arg == FailureModeRequest.TYPE_LEFT_OVERRIDE:
    print("Ovr left!")
  elif arg == FailureModeRequest.TYPE_RIGHT_OVERRIDE:
    print("Ovr right!")
  elif arg == FailureModeRequest.TYPE_ACCEL_OVERRIDE:
    print("Ovr accel!")
  elif arg == FailureModeRequest.TYPE_DECEL_OVERRIDE:
    print("Ovr decel!")
  elif arg == FailureModeRequest.TYPE_SEND_TELEOPPATH_OVERRIDE:
    msg.teleop_filename = teleopMenu.get()
    print ("Publishing teleop path: ", msg.teleop_filename)
    publishTeleopCmd = "bash " + teleopFolder + "publish-teleop.sh "
    publishTeleopCmd += teleopFolder + msg.teleop_filename
    try:
        #os.system(publishTeleopCmd)
        a=1
    except:
        print("Unable to publish teleop path.")
        
  elif arg == FailureModeRequest.TYPE_PATH_SPD_OVERRIDE:
    targetSpeed, lateralAcceleration, targetAccel, steeringAngle = retrieve_valInput()

    printPATHSPDparams = "Ovr path spd! "
   
    msg.use_target_speed = True
    msg.target_speed = targetSpeed
    printPATHSPDparams += "target speed: " + str(targetSpeed)
    
    print (printPATHSPDparams)
    
  global failureModeRequestPub
  
  failureModeRequestPub.publish(msg)
  

def interfaceHealth(agent_name, ping_machines, sensors_list, algs_list, cmd_list, dest_list = [], multi_dest_list = []):
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
  global mapsel # controls map selection menu
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
    
# List of single destinations to offer
  global DestList
  numDestinations = 0
  DestList = []
  for e in dest_list:
    nameIn = e["name"]
    destX  = e["posX"]
    destY  = e["posY"]
    destTh = e["posTh"]
    
    DestList.append(SetDest(nameIn, destX, destY, destTh))
    numDestinations = numDestinations + 1

# List of multiple destinations to offer
  global MultiDestList
  numMultiDestinations = 0
  MultiDestList = []
  for e in multi_dest_list:
    nameIn  = e["name"]
    destsIn = e["dests"]

    MultiDestList.append(MultiSetDest(nameIn, destsIn))
    numMultiDestinations = numMultiDestinations + 1

  # Setup window dimensions and title
  window = Tkinter.Tk(className='ailsvwindow')
  windowTitle = agent_name + " Interface"
  window.title(windowTitle)
  window.geometry('550x700')
  window.protocol("WM_DELETE_WINDOW", on_closing)

# Frame row def'n
  launchAllSectionTitleRow = 1
  launchAllSectionRow = launchAllSectionTitleRow + 1
  setConfigSectionTitleRow =  launchAllSectionRow + 1
  setConfigSectionRow =  setConfigSectionTitleRow + 1
  computerSectionTitleRow = setConfigSectionRow + 1
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
  tab3 = Tkinter.Frame(tab_control)
  tab4 = Tkinter.Frame(tab_control)
  tab5 = Tkinter.Frame(tab_control)
  tab_control.add(tab1, text='Status')
  tab_control.add(tab2, text='Commands')
  tab_control.add(tab3, text='Validation')
  tab_control.add(tab4, text='Destinations')
  tab_control.add(tab5, text='Multi Destinations')
  tab_control.pack(expand=1, fill='both')

  buttonWidth = 7

# Frame def
  lbl_all = Tkinter.Label(tab1, text="System Launch")
  lbl_all.grid(row=launchAllSectionTitleRow, stick=Tkinter.W)
  allLaunchFrame = Tkinter.Frame(tab1, width=400, height=50)
  allLaunchFrame.grid(row=launchAllSectionRow,columnspan=10, sticky=Tkinter.W)
  
  lbl_config = Tkinter.Label(tab1, text="Set Config")
  lbl_config.grid(row=setConfigSectionTitleRow, stick=Tkinter.W)
  setConfigFrame = Tkinter.Frame(tab1, width=400, height=50)
  setConfigFrame.grid(row=setConfigSectionRow,columnspan=10, sticky=Tkinter.W)
  
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
  
  lbl_dest = Tkinter.Label(tab4, text="Set Dest")
  lbl_dest.grid(row=1, sticky=Tkinter.W)
  destFrame = Tkinter.Frame(tab4, width=400, height=50)
  destFrame.grid(row=2,columnspan=10, sticky=Tkinter.W)
  
  lbl_multi_dest = Tkinter.Label(tab5, text="Set Multi Dest")
  lbl_multi_dest.grid(row=1, sticky=Tkinter.W)
  multiDestFrame = Tkinter.Frame(tab5, width=400, height=50)
  multiDestFrame.grid(row=2,columnspan=10, sticky=Tkinter.W)
  
  vehValTitleRow = 1;
  vehValButtonsRow = vehValTitleRow + 1
  drvValTitleRow = vehValButtonsRow + 1
  drvValButtonsRow = drvValTitleRow + 1
  
  lbl_vehVal = Tkinter.Label(tab3, text="Vehicle Validation")
  lbl_vehVal.grid(row=vehValTitleRow, sticky=Tkinter.W)
  vehValFrame = Tkinter.Frame(tab3, width=400, height=50)
  vehValFrame.grid(row=vehValButtonsRow,columnspan=10, sticky=Tkinter.W)
  
  lbl_drvVal = Tkinter.Label(tab3, text="Driver Validation")
  lbl_drvVal.grid(row=drvValTitleRow, sticky=Tkinter.W)
  drvValFrame = Tkinter.Frame(tab3, width=400, height=50)
  drvValFrame.grid(row=drvValButtonsRow,columnspan=10, sticky=Tkinter.W)
  
# Create "Launch All" buttons - Note, apparently we only use the 'button' variable on the next line and then it is ignored.
  button1 = Tkinter.Button(allLaunchFrame, text="Launch ALL", width=buttonWidth*2, padx=1, relief="raised",command=startAll)
  button1.grid(column=1, row=1, sticky=Tkinter.W+Tkinter.E)

  button2 = Tkinter.Button(allLaunchFrame, text="Stop ALL", width=buttonWidth*2, padx=1, relief="raised",command=stopAll)
  button2.grid(column=2, row=1, sticky=Tkinter.W+Tkinter.E)
  
  button3 = Tkinter.Button(allLaunchFrame, text="Mute All", width=buttonWidth*2, padx=1, relief="raised",command=muteSpeaker)
  button3.grid(column=3, row=1, sticky=Tkinter.W+Tkinter.E)
  
  button4 = Tkinter.Button(allLaunchFrame, text="Mute Good", width=buttonWidth*2, padx=1, relief="raised",command=muteGoodSpeaker)
  button4.grid(column=4, row=1, sticky=Tkinter.W+Tkinter.E)
  
  button1 = Tkinter.Button(allLaunchFrame, text="Start Record", width=buttonWidth*2, padx=1, relief="raised",command=startRecord)
  button1.grid(column=1, row=2, sticky=Tkinter.W+Tkinter.E)

  button2 = Tkinter.Button(allLaunchFrame, text="Stop Record", width=buttonWidth*2, padx=1, relief="raised",command=stopRecord)
  button2.grid(column=2, row=2, sticky=Tkinter.W+Tkinter.E)

  # use global map_name - global mapsel controls the menu selection
  mapsel = Tkinter.StringVar(allLaunchFrame);

  global map_name
  try:
    check_map_name = rospy.get_param('/map_name')
    if (check_map_name in map_options):
      map_name = check_map_name
  except:
    print('parameter server not running yet')

  #print('check_map_name ', check_map_name)
  #print('1map_name ', map_name)
  #print('2map_name ', map_name)

  #mapsel.set(map_name)
  m=Tkinter.OptionMenu(allLaunchFrame, mapsel, *map_options, command=updateMap)
  m.grid(column=3, row=2, sticky=Tkinter.W+Tkinter.E)

  button4 = Tkinter.Button(allLaunchFrame, text="Bye", width=buttonWidth*2, padx=1, relief="raised",command=bye)
  button4.grid(column=4, row=2, sticky=Tkinter.W+Tkinter.E)
  
  button5 = Tkinter.Button(setConfigFrame, text="Demo", width=buttonWidth*2, padx=1, relief="raised",command=demoConfig)
  button5.grid(column=1, row=1, sticky=Tkinter.W+Tkinter.E)
  
  button6 = Tkinter.Button(setConfigFrame, text="Experimental", width=buttonWidth*2, padx=1, relief="raised",command=expConfig)
  button6.grid(column=2, row=1, sticky=Tkinter.W+Tkinter.E)

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
      c.label = Tkinter.Button(cmdFrame, text=c.cmdName, width=commandWidth, padx=1, relief="raised", command=startAll)
      c.label.grid(column=c.col, row=c.row, sticky=Tkinter.W+Tkinter.E)
      c.label = Tkinter.Button(cmdFrame, text="stop", width=commandWidth, padx=1, relief="raised", command=stopAll)
      c.label.grid(column=c.col+1, row=c.row, sticky=Tkinter.W+Tkinter.E)
    else:
      c.label = Tkinter.Button(cmdFrame, text=c.cmdName, width=commandWidth, padx=1, relief="raised", command=c.command)
      c.label.grid(column=c.col, row=c.row, sticky=Tkinter.W+Tkinter.E)
      c.label = Tkinter.Button(cmdFrame, text="stop", width=commandWidth, padx=1, relief="raised", command=c.killCmd)
      c.label.grid(column=c.col+1, row=c.row, sticky=Tkinter.W+Tkinter.E)
      
  #c.label = Tkinter

  destRow = 0
  for d in DestList:
      d.label = Tkinter.Button(destFrame, text=d.destName, width=commandWidth, padx=1, relief="raised", command=d.command)
      d.label.grid(column=0, row=destRow, sticky=Tkinter.W+Tkinter.E)
      destRow = destRow + 1
  
  multiDestRow = 0
  for d in MultiDestList:
      d.label = Tkinter.Button(multiDestFrame, text=d.multiDestName, width=commandWidth, padx=1, relief="raised", command=d.command)
      d.label.grid(column=0, row=multiDestRow, sticky=Tkinter.W+Tkinter.E)
      multiDestRow = multiDestRow + 1
  
  global teleopFolder
  teleopFolder = os.getenv("HOME")+"/projects/nrc_ws/src/nrc_ralp/nrc_ralp_svcs/launch/recorded-teleop-plans/"
  teleopFileList = []
  try:
      teleopFileList = [fname for fname in os.listdir(teleopFolder) if fname.endswith('.yaml')]
  except:
      print("Cannot find teleop folder.")
          
  colWidth = 14
  teleopDesc = Tkinter.Button(vehValFrame, text="Send Teleop", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_SEND_TELEOPPATH_OVERRIDE))
  teleopDesc.grid(row=1, column=1,sticky=Tkinter.W+Tkinter.E)
  global teleopMenu
  teleopMenu = ttk.Combobox(vehValFrame, values=teleopFileList, state='readonly')
  if len(teleopFileList)>0 :
      teleopMenu.current(len(teleopFileList)-1)
  teleopMenu.grid(row=1, column=2, columnspan=3, sticky=Tkinter.W+Tkinter.E) 
  
  teleopSpd = Tkinter.Button(vehValFrame, text="Override Path Speed", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_PATH_SPD_OVERRIDE))
  teleopSpd.grid(row=2, column=1, columnspan=4, sticky=Tkinter.W+Tkinter.E)
  
  global valSpdTextbox
  global valStrTextbox
  global valAccelTextbox
  global valStrAngleTextbox  
  
  valSpdTextBoxDesc = Tkinter.Label(vehValFrame, text="Tgt Speed (kph)", width=colWidth)
  valSpdTextBoxDesc.grid(row=3, column=1, sticky=Tkinter.W)
  valSpdTextbox = Tkinter.Spinbox(vehValFrame, from_=0, to=150, increment=1, width=10)
  valSpdTextbox.grid(row=3, column=2, sticky=Tkinter.W+Tkinter.E)
  
  var1 = Tkinter.StringVar()
  valStrTextBoxDesc = Tkinter.Label(vehValFrame, text="Tgt Lat G (G)", width=colWidth)
  valStrTextBoxDesc.grid(row=3, column=3, sticky=Tkinter.W)
  valStrTextbox = Tkinter.Spinbox(vehValFrame, from_=-1, to=1, increment=0.1, width=10, textvariable=var1)
  valStrTextbox.grid(row=3, column=4, sticky=Tkinter.W+Tkinter.E)
  var1.set(0)
  
  valAccelTextBoxDesc = Tkinter.Label(vehValFrame, text="Tgt Accel (m/s2)", width=colWidth)
  valAccelTextBoxDesc.grid(row=4, column=1, sticky=Tkinter.W)
  valAccelTextbox = Tkinter.Spinbox(vehValFrame, from_=0, to=5, increment=0.1, width=10)
  valAccelTextbox.grid(row=4, column=2, sticky=Tkinter.W+Tkinter.E)

  var2 = Tkinter.StringVar()
  valStrAngleTextBoxDesc = Tkinter.Label(vehValFrame, text="Tgt Steering (deg)", width=colWidth)
  valStrAngleTextBoxDesc.grid(row=4, column=3, sticky=Tkinter.W)
  valStrAngleTextbox = Tkinter.Spinbox(vehValFrame, from_=-180, to=180, increment=1, width=10, textvariable=var2)
  valStrAngleTextbox.grid(row=4, column=4, sticky=Tkinter.W+Tkinter.E)
  var2.set(0)
  
  valSpdCommit = Tkinter.Button(vehValFrame, text="Go!", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_GO_OVERRIDE))
  valSpdCommit.grid(column=1, row=5, sticky=Tkinter.W+Tkinter.E)
  
  valSelect = Tkinter.Label(vehValFrame, text="Use params:", width=colWidth)
  valSelect.grid(row=5, column=2, sticky=Tkinter.W)
  
  global valSpdSelect
  valSpdSelect = ttk.Combobox(vehValFrame, values=["Tgt Speed (kph)","Tgt Accel (m/s2)"], state='readonly', width=colWidth)
  valSpdSelect.current(0)
  valSpdSelect.grid(row=5, column=3, sticky=Tkinter.W)
  
  global valStrSelect
  valStrSelect = ttk.Combobox(vehValFrame, values=["Tgt Lat G (G)","Tgt Steering (deg)"], state='readonly', width=colWidth)
  valStrSelect.current(0)
  valStrSelect.grid(row=5, column=4, sticky=Tkinter.W)  
  
  valReset = Tkinter.Button(vehValFrame, text="Reset", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_RESET_OVERRIDE))
  valReset.grid(column=1, columnspan=2, row=6, sticky=Tkinter.W+Tkinter.E)
  

  valSpdStop = Tkinter.Button(vehValFrame, text="Stop!", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_STOP_OVERRIDE))
  valSpdStop.grid(column=3, columnspan=2, row=6, sticky=Tkinter.W+Tkinter.E)
  
  valOvrLeft = Tkinter.Button(vehValFrame, text="Override Left!", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_LEFT_OVERRIDE))
  valOvrLeft.grid(column=1, columnspan=2, row=7, sticky=Tkinter.W+Tkinter.E)
  valOvrRight = Tkinter.Button(vehValFrame, text="Override Right!", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_RIGHT_OVERRIDE))
  valOvrRight.grid(column=3, columnspan=2, row=7, sticky=Tkinter.W+Tkinter.E)
  valOvrAcc = Tkinter.Button(vehValFrame, text="Override Accel!", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_ACCEL_OVERRIDE))
  valOvrAcc.grid(column=1, columnspan=2, row=8, sticky=Tkinter.W+Tkinter.E)
  valOvrDec = Tkinter.Button(vehValFrame, text="Override Decel!", width=colWidth, padx=1, relief="raised", command=partial(sendValCmd,FailureModeRequest.TYPE_DECEL_OVERRIDE))
  valOvrDec.grid(column=3, columnspan=2, row=8, sticky=Tkinter.W+Tkinter.E)

  
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
  
  global failureModeRequestPub
  failureModeRequestPub = rospy.Publisher("/failure_mode_request",FailureModeRequest,queue_size=1)
  
  csvWriter = CsvWriter()
  csvWriter.openCsv()
  
  pingTimer = 0
  pingOrder = 0
  csvTimer = 0
  engaged = 0
  currentDist = 0
  engagedStartDist = 0
  
  # Setup rosparams - pass in runtime options here
  # Note: we now have a flag to Rerun this if the map name changes
  os.system("rosparam set /agent_name "+agent_name)
  os.system("rosrun nrc_svcs paramsForDriving.sh")
  os.system("rosrun nrc_svcs paramsForMap.sh "+map_name)
  
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
      print ("Autostarting ALL")
      autostart = False
      #speakerIsMuted = False
      #goodBeepIsMuted = False
      startAll()
      
    if autorecord and currentTime > autorecordTime:
      print ("Starting autoRecord")
      autorecord = False
      startRecord()
  
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
          jsonText  += ","
          jsonText  += c.jsonText
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
    
    # Make beeps
    if rospy.Time.now().to_sec() > nextBeepTime:
      duration = 0.1  # seconds
      freq = 880  # Hz
      
      if not speakerIsMuted:
        if (errorBeep or not goodBeepIsMuted):
          os.system('play -nq -t alsa synth {} sine {}'.format(duration, freq))  # need "sudo apt install sox"
        
        if errorBeep:
          print ("Error Beep")
        else:
          print ("Good Beep")
        
      
      rapidBeepCount = rapidBeepCount + 1
      
      # Set beep patterns
      maxBeepCount = 1
      beepDelay = 10.0
      shortBeepDelay = 0.25
      if errorBeep:
        maxBeepCount = 4
        beepDelay = 3.0
        shortBeepDelay = 0.0

      if rapidBeepCount > maxBeepCount:
        nextBeepTime = rospy.Time.now().to_sec() + beepDelay
        rapidBeepCount = 0
      else:
        nextBeepTime = rospy.Time.now().to_sec() + shortBeepDelay
        
    
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

