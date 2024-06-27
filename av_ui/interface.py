#!/usr/bin/python

import sys
import os
from nrc_msgs.msg import FailureModeRequest
from subsystem import Subsystem

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
    
class Interface:
  def __init__(self, name, mapName):
    self.name = name
    self.window = []
    self.windowOpen = False
    self.launchAllReq = False
    
    self.selectedMap = mapName
    self.mapsel = []
    self.stack_active = False
    
    # Manual Control Topics
    self.valSpdTextbox = []
    self.valStrTextbox = []
    self.valAccelTextbox = [] 
    self.valStrAngleTextbox = []
    self.valSpdSelect = []
    self.valStrSelect = []
    
    self.teleopMenu = []
  
  def onClosing(self):
    print("OnClosing")
    self.windowOpen = False
    self.window.quit()
  
  def updateMap(self, newName):
    #global map_name, stack_active, mapsel
    if self.stack_active:
      self.mapsel.set(self.selectedMap) # set it back
      title='No map change while running'
      msg  = 'Sorry Charlie - shut things down before changing the map'
      if sys.version_info[0] == 3:
        messagebox.showinfo(title, msg)
      else:
        tkMessageBox.showinfo(title, msg)
    else:
      self.selectedMap = newName
      print ('New map name selected is ',self.selectedMap)
      os.system("rosrun nrc_av_ui paramsForMap.sh "+newName)
  
  def setupWindow(self, agent):
    # Setup window dimensions and title
    self.window = Tkinter.Tk(className='ailsvwindow')
    windowTitle = self.name + " Interface"
    self.window.title(windowTitle)
    self.window.geometry('550x700')
    self.window.protocol("WM_DELETE_WINDOW", self.onClosing)  # Bind action when window closes

  # Frame row def'n
    launchAllSectionTitleRow = 1
    launchAllSectionRow = launchAllSectionTitleRow + 1
    setStatusSectionTitleRow =  launchAllSectionRow + 1
    setStatusSectionRow =  setStatusSectionTitleRow + 1
    computerSectionTitleRow = setStatusSectionRow + 1
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
    tab_control = ttk.Notebook(self.window)
    tab1 = Tkinter.Frame(tab_control)
    #tab2 = Tkinter.Frame(tab_control)
    tab3 = Tkinter.Frame(tab_control)
    tab4 = Tkinter.Frame(tab_control)
    #tab5 = Tkinter.Frame(tab_control)
    tab_control.add(tab1, text='Status')
    #tab_control.add(tab2, text='Commands')
    tab_control.add(tab3, text='Validation')
    tab_control.add(tab4, text='Destinations')
    #tab_control.add(tab5, text='Multi Destinations')
    tab_control.pack(expand=1, fill='both')

    buttonWidth = 7

  # Frame def
    lbl_all = Tkinter.Label(tab1, text="System Launch")
    lbl_all.grid(row=launchAllSectionTitleRow, stick=Tkinter.W)
    allLaunchFrame = Tkinter.Frame(tab1, width=400, height=50)
    allLaunchFrame.grid(row=launchAllSectionRow,columnspan=10, sticky=Tkinter.W)
    
    lbl_config = Tkinter.Label(tab1, text="Status")
    lbl_config.grid(row=setStatusSectionTitleRow, stick=Tkinter.W)
    setStatusFrame = Tkinter.Frame(tab1, width=400, height=50)
    setStatusFrame.grid(row=setStatusSectionRow,columnspan=10, sticky=Tkinter.W)
    
    lbl_comp = Tkinter.Label(tab1, text="Subsystems")
    lbl_comp.grid(row=computerSectionTitleRow, sticky=Tkinter.W)
    compFrame = Tkinter.Frame(tab1, width=400, height=50)
    compFrame.grid(row=computerSectionRow,columnspan=10, sticky=Tkinter.W)

    #lbl_sens = Tkinter.Label(tab1, text="Sensor Status")
    #lbl_sens.grid(row=sensorsSectionTitleRow, sticky=Tkinter.W)
    #sensFrame = Tkinter.Frame(tab1, width=400, height=50)
    #sensFrame.grid(row=sensorsSectionRow,columnspan=10, sticky=Tkinter.W)

    #lbl_alg = Tkinter.Label(tab1, text="Algorithm Status")
    #lbl_alg.grid(row=percSectionTitleRow, sticky=Tkinter.W)
    #algFrame = Tkinter.Frame(tab1, width=400, height=50)
    #algFrame.grid(row=percSectionRow,columnspan=10, sticky=Tkinter.W)

    lbl_text = Tkinter.Label(tab1, text="Text Status")
    lbl_text.grid(row=textSectionTitleRow, sticky=Tkinter.W)
    textFrame = Tkinter.Frame(tab1, width=400, height=50)
    textFrame.grid(row=textSectionRow,columnspan=10, sticky=Tkinter.W)
    
    #lbl_cmd = Tkinter.Label(tab2, text="Send Command")
    #lbl_cmd.grid(row=1, sticky=Tkinter.W)
    #cmdFrame = Tkinter.Frame(tab2, width=400, height=50)
    #cmdFrame.grid(row=2,columnspan=10, sticky=Tkinter.W)
    
    lbl_dest = Tkinter.Label(tab4, text="Set Dest")
    lbl_dest.grid(row=1, sticky=Tkinter.W)
    destFrame = Tkinter.Frame(tab4, width=400, height=50)
    destFrame.grid(row=2,columnspan=10, sticky=Tkinter.W)
    
    #lbl_multi_dest = Tkinter.Label(tab5, text="Set Multi Dest")
    #lbl_multi_dest.grid(row=1, sticky=Tkinter.W)
    #multiDestFrame = Tkinter.Frame(tab5, width=400, height=50)
    #multiDestFrame.grid(row=2,columnspan=10, sticky=Tkinter.W)
    
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

    button4 = Tkinter.Button(allLaunchFrame, text="Start All", width=buttonWidth*2, padx=1, relief="raised",command=agent.setLaunchAll)
    button4.grid(column=4, row=2, sticky=Tkinter.W+Tkinter.E)

    # use global map_name - global mapsel controls the menu selection
    mapsel = Tkinter.StringVar(allLaunchFrame);
   
    map_options = ['Sanborn2019MMv24','Sanborn2020PNHv2','Sanborn2022BRv2','MiniMap','SC_Cached','SanMiguel_Cached','Noe.set','Franklin.set','THill_Cached']
    
    try:
      check_map_name = rospy.get_param('/map_name')
      if (check_map_name in map_options):
        self.selectedMap = check_map_name
    except:
      print('parameter server not running yet')

    mapsel.set(self.selectedMap)
    m=Tkinter.OptionMenu(allLaunchFrame, mapsel, *map_options, command=self.updateMap)
    m.grid(column=3, row=2, sticky=Tkinter.W+Tkinter.E)


    
    #button5 = Tkinter.Button(setConfigFrame, text="Demo", width=buttonWidth*2, padx=1, relief="raised",command=demoConfig)
    #button5.grid(column=1, row=1, sticky=Tkinter.W+Tkinter.E)
    
    #button6 = Tkinter.Button(setConfigFrame, text="Experimental", width=buttonWidth*2, padx=1, relief="raised",command=expConfig)
    #button6.grid(column=2, row=1, sticky=Tkinter.W+Tkinter.E)
    
    commandWidth = 7
    stopWidth = 6
    msgWidth = 7
    objRow = 1
    for s in agent.subsystems:
      s.startButton = Tkinter.Button(compFrame, text=s.name, width=commandWidth, padx=1, relief="raised", command=s.reqStart)
      s.startButton.grid(column=1, row=objRow, sticky=Tkinter.W+Tkinter.E)
      s.stopButton = Tkinter.Button(compFrame, text="stop", width=stopWidth, padx=1, relief="raised", command=s.reqStop)
      s.stopButton.grid(column=2, row=objRow, sticky=Tkinter.W+Tkinter.E)
      
      objCol = 3
      for m in s.monitors:
        m.label = Tkinter.Button(compFrame, text=m.name, width=msgWidth, padx=1, pady=1, relief="raised", bg="#505050", command=m.displayMore)
        m.label.grid(column=objCol, row=objRow, sticky=Tkinter.W+Tkinter.E)
        textStr = m.name+'\n'+str(m.msgCount)
        m.label.configure(text=textStr)
        m.label.configure(font = ("Helvetica",8))
        objCol = objCol + 1
        
      objRow = objRow+1
     
    self.snpTextBox = Tkinter.Message(setStatusFrame, text="Snapshot: Init", padx=1, width=500, relief="raised", bg="white", anchor=Tkinter.W)
    self.snpTextBox.grid(column=0, row=0, columnspan=10)
    
    self.textBox = Tkinter.Message(textFrame, text="Init", padx=1, width=500, relief="raised", bg="white", anchor=Tkinter.W)
    self.textBox.grid(column=0, row=0, columnspan=10)
      
    self.windowOpen = True
    
  def retrieve_valInput(self):  
    inputValue1=self.valSpdTextbox.get()
    inputValue2=self.valStrTextbox.get()
    inputValue3=self.valAccelTextbox.get()
    inputValue4=self.valStrAngleTextbox.get()
    return float(inputValue1), float(inputValue2), float(inputValue3), float(inputValue4)

  def retrieve_valTypeInput():
    inputValue1=self.valSpdSelect.get()
    inputValue2=self.valStrSelect.get()
    return inputValue1, inputValue2

  def getValCmd(arg):
      
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
      msg.teleop_filename = self.teleopMenu.get()
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
      
    return msg
  
  def statusToColor(self,status):
    if status == 3:
      return "lightgreen"
    elif status == 2:
      return "orange"
    elif status == 1:
      return "pink"
    else:
      return "#D0D0D0"
  
  def updateSnpText(self,fileTransfer):
    newText = ''
    if fileTransfer.state[0] == 'Requested' or fileTransfer.state[0] == 'Wait':
      newText = ''.join(fileTransfer.state)
    elif fileTransfer.state[0] == 'Begin':
      newText = 'Snapshot: Ready to send '
    elif fileTransfer.state[0] == 'Sending':
      MB_sent  = int(fileTransfer.bytesSent/1000000)
      MB_total = int(fileTransfer.filesize/1000000)
      newText = 'Snapshot: Sending: '+str(MB_sent)+' / '+str(MB_total)+' MB '
    else:
      newText = fileTransfer.state[0]
    
    self.snpTextBox.configure(text=newText)
  
  def update(self,subsystems):
    msgText = []
    for s in subsystems:
      for m in s.monitors:
        m.label.configure(bg=self.statusToColor(m.status))
        textStr = m.name+'\n'+str(m.msgCount)
        m.label.configure(text=textStr)
        if m.displayText == 1 or m.autoText == 1:
          msgText +=m.name+": "+m.msgText+'\n'

      s.startButton.configure(bg=self.statusToColor(s.status))
    
    if (msgText==[]):
      msgText = "No status messages to display"
    
    self.textBox.configure(text=''.join(msgText))
    
    self.window.update_idletasks()
    self.window.update()

