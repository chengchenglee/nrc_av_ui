#!/usr/bin/python

import sys
import os
from nrc_msgs.msg import FailureModeRequest
from include.subsystem import Subsystem
import rospy
import subprocess
# button callbacks
from functools import partial
#from MultiSetDest import MultiSetDest
#from MultiSetDest import MULTI_DEST_LIST

# Gui
if sys.version_info[0] < 3:
  import Tkinter
  import tkMessageBox as messagebox # python 2.7 flavor
  import ttk
else: # 3+
  if sys.version_info[1] < 6:
    import Tkinter # <3.6
    import ttk
    from Tkinter import messagebox
  else:
    import tkinter as Tkinter # 3.6
    import tkinter.ttk as ttk
    from tkinter import messagebox
    
nrcWsPath = os.path.join(os.path.expanduser("~"), 'projects/nrc_ws')
mapMenuExePath = nrcWsPath + '/devel/lib/maav_algo/MapManager'

class Interface:
  def __init__(self, name, mapName):
    self.name = name
    self.window = []
    self.windowOpen = False
    self.launchAllReq = False
    self.wantToRun = True # keep true until exit desired
    
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
    
    self.teleopFolder = ""
    self.teleopMenu = []

    #self.MultiDestList = self.load_multi_destList(MULTI_DEST_LIST)
    self.MultiDestList = []

    self.failureModeRequestPub = rospy.Publisher("/failure_mode_request",FailureModeRequest,queue_size=1)
  
  def onClosing(self):
    print("OnClosing")
    self.wantToRun=False;
    self.windowOpen = False
    self.window.quit()
  
  #######################################################################
  # paramsForMap.sh is deprecated
  # 'MapManager' program uses facilities in MetricMapManager to find all
  #   relevant parameters for a given map name. This is required to use
  #   the dynamically generated names from MetricMapManager
  def updateMapParams(self, newName):
    # use map name from menu to capture required parameters
    if os.path.isfile(mapMenuExePath) and os.access(mapMenuExePath, os.X_OK):
      try:
        # 'MapManager -rmap_name' outputs rosparams for map 'map_name'
        output = subprocess.check_output([mapMenuExePath,'-r'+newName])
        params = output.decode().splitlines()
        for p in params:
          apair = p.split(':')
          if apair[0]=='ERROR': continue
          if apair[0]=='WARN': continue
          if apair[0]=='INFO': continue
          if (len(apair)==2):
            #print('DEBUG',apair[0],'and',apair[1])
            # running rosparam at the command line handles string values as desired
            os.system('rosparam set '+apair[0]+' '+apair[1])
            # don't use 'set_param' on raw output from MapManager (all strings)
            #rospy.set_param(apair[0],apair[1])
          else:
            print('WARN: problem in MapManger -r param output')
      except:
        os.system("rosrun nrc_av_ui paramsForMap.sh "+newName)
    else:
      os.system("rosrun nrc_av_ui paramsForMap.sh "+newName)


  def updateMap(self, newName):
    #global map_name, stack_active, mapsel
    if self.stack_active:
      self.mapsel.set(self.selectedMap) # set it back
      title='No map change while running'
      msg  = 'Sorry Charlie - shut things down before changing the map'
      # need to make a 'popup' or 'modal' function
      messagebox.showinfo(title, msg)
    else:
      self.selectedMap = newName
      print ('New map name selected is ',self.selectedMap)
      rospy.set_param('/map_name', newName)
      self.updateMapParams(newName)
  
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
    tab5 = Tkinter.Frame(tab_control)
    tab_control.add(tab1, text='Status')
    #tab_control.add(tab2, text='Commands')
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
    
    lbl_multi_dest = Tkinter.Label(tab5, text="Set Multi Dest")
    lbl_multi_dest.grid(row=1, sticky=Tkinter.W)
    multiDestFrame = Tkinter.Frame(tab5, width=400, height=50)
    multiDestFrame.grid(row=2,columnspan=10, sticky=Tkinter.W)
    
    vehValTitleRow = 1
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

    buttonQuit = Tkinter.Button(allLaunchFrame, text="Quit", width=buttonWidth*2, padx=1, relief="raised",command=self.onClosing)
    buttonQuit.grid(column=6, row=2, sticky=Tkinter.W+Tkinter.E)

    # use global map_name - global mapsel controls the menu selection
    mapsel = Tkinter.StringVar(allLaunchFrame);

    # some people are not using workspace nrc_ws, so
    # put workspace in one variable and try to use it
    map_options = []
    if os.path.isfile(mapMenuExePath) and os.access(mapMenuExePath, os.X_OK):
      output = subprocess.check_output([mapMenuExePath,'--menu'])
      map_options = output.decode().splitlines()
    else:
      map_options = ['Sanborn2019MMv24','Sanborn2020PNHv2','MiniMap','SC_Cached','SanMiguel_Cached','Noe.set','Franklin.set','THill_Cached','SCTile','new_MM_map']

    try:
      check_map_name = rospy.get_param('/map_name')
      if (check_map_name in map_options):
        self.selectedMap = check_map_name
    except:
      print('parameter server not running yet')

    mapsel.set(self.selectedMap)
    m=Tkinter.OptionMenu(allLaunchFrame, mapsel, *map_options, command=self.updateMap)
    m.grid(column=3, row=2, sticky=Tkinter.W+Tkinter.E)

    # save for later reference
    self.mapsel = mapsel
    # update map params
    self.updateMapParams(self.selectedMap)

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

    #enable multi-destinations buttons in destinations tab..
    multiDestRow = 1
    for d in self.MultiDestList:
      d.label = Tkinter.Button(multiDestFrame, text=d.multiDestName, width=commandWidth*4, padx=1, relief="raised", command=d.command)
      d.label.grid(column=0, row=multiDestRow, sticky=Tkinter.W+Tkinter.E)
      multiDestRow = multiDestRow + 1

    self.teleopFolder = os.getenv("HOME")+"/projects/nrc_ws/src/nrc_ralp/nrc_ralp_svcs/launch/recorded-teleop-plans/"
    teleopFileList = []
    try:
        teleopFileList = [fname for fname in os.listdir(teleopFolder) if fname.endswith('.yaml')]
    except:
        print("Cannot find teleop folder.")
            
    colWidth = 14
    teleopDesc = Tkinter.Button(vehValFrame, text="Send Teleop", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_SEND_TELEOPPATH_OVERRIDE))
    teleopDesc.grid(row=1, column=1,sticky=Tkinter.W+Tkinter.E)
    self.teleopMenu = ttk.Combobox(vehValFrame, values=teleopFileList, state='readonly')
    if len(teleopFileList)>0 :
        self.teleopMenu.current(len(teleopFileList)-1)
    self.teleopMenu.grid(row=1, column=2, columnspan=3, sticky=Tkinter.W+Tkinter.E)

    teleopSpd = Tkinter.Button(vehValFrame, text="Override Path Speed", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_PATH_SPD_OVERRIDE))
    teleopSpd.grid(row=2, column=1, columnspan=4, sticky=Tkinter.W+Tkinter.E)
    
    valSpdTextBoxDesc = Tkinter.Label(vehValFrame, text="Tgt Speed (kph)", width=colWidth)
    valSpdTextBoxDesc.grid(row=3, column=1, sticky=Tkinter.W)
    self.valSpdTextbox = Tkinter.Spinbox(vehValFrame, from_=0, to=150, increment=1, width=10)
    self.valSpdTextbox.grid(row=3, column=2, sticky=Tkinter.W+Tkinter.E)
    
    var1 = Tkinter.StringVar()
    valStrTextBoxDesc = Tkinter.Label(vehValFrame, text="Tgt Lat G (G)", width=colWidth)
    valStrTextBoxDesc.grid(row=3, column=3, sticky=Tkinter.W)
    self.valStrTextbox = Tkinter.Spinbox(vehValFrame, from_=-1, to=1, increment=0.1, width=10, textvariable=var1)
    self.valStrTextbox.grid(row=3, column=4, sticky=Tkinter.W+Tkinter.E)
    var1.set(0)
    
    valAccelTextBoxDesc = Tkinter.Label(vehValFrame, text="Tgt Accel (m/s2)", width=colWidth)
    valAccelTextBoxDesc.grid(row=4, column=1, sticky=Tkinter.W)
    self.valAccelTextbox = Tkinter.Spinbox(vehValFrame, from_=0, to=5, increment=0.1, width=10)
    self.valAccelTextbox.grid(row=4, column=2, sticky=Tkinter.W+Tkinter.E)

    var2 = Tkinter.StringVar()
    valStrAngleTextBoxDesc = Tkinter.Label(vehValFrame, text="Tgt Steering (deg)", width=colWidth)
    valStrAngleTextBoxDesc.grid(row=4, column=3, sticky=Tkinter.W)
    self.valStrAngleTextbox = Tkinter.Spinbox(vehValFrame, from_=-180, to=180, increment=1, width=10, textvariable=var2)
    self.valStrAngleTextbox.grid(row=4, column=4, sticky=Tkinter.W+Tkinter.E)
    var2.set(0)
    
    valSpdCommit = Tkinter.Button(vehValFrame, text="Go!", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_GO_OVERRIDE))
    valSpdCommit.grid(column=1, row=5, sticky=Tkinter.W+Tkinter.E)
    
    valSelect = Tkinter.Label(vehValFrame, text="Use params:", width=colWidth)
    valSelect.grid(row=5, column=2, sticky=Tkinter.W)
    
    self.valSpdSelect = ttk.Combobox(vehValFrame, values=["Tgt Speed (kph)","Tgt Accel (m/s2)"], state='readonly', width=colWidth)
    self.valSpdSelect.current(0)
    self.valSpdSelect.grid(row=5, column=3, sticky=Tkinter.W)

    self.valStrSelect = ttk.Combobox(vehValFrame, values=["Tgt Lat G (G)","Tgt Steering (deg)"], state='readonly', width=colWidth)
    self.valStrSelect.current(0)
    self.valStrSelect.grid(row=5, column=4, sticky=Tkinter.W)

    valReset = Tkinter.Button(vehValFrame, text="Reset", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_RESET_OVERRIDE))
    valReset.grid(column=1, columnspan=2, row=6, sticky=Tkinter.W+Tkinter.E)
    

    valSpdStop = Tkinter.Button(vehValFrame, text="Stop!", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_STOP_OVERRIDE))
    valSpdStop.grid(column=3, columnspan=2, row=6, sticky=Tkinter.W+Tkinter.E)
    
    valOvrLeft = Tkinter.Button(vehValFrame, text="Override Left!", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_LEFT_OVERRIDE))
    valOvrLeft.grid(column=1, columnspan=2, row=7, sticky=Tkinter.W+Tkinter.E)
    valOvrRight = Tkinter.Button(vehValFrame, text="Override Right!", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_RIGHT_OVERRIDE))
    valOvrRight.grid(column=3, columnspan=2, row=7, sticky=Tkinter.W+Tkinter.E)
    valOvrAcc = Tkinter.Button(vehValFrame, text="Override Accel!", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_ACCEL_OVERRIDE))
    valOvrAcc.grid(column=1, columnspan=2, row=8, sticky=Tkinter.W+Tkinter.E)
    valOvrDec = Tkinter.Button(vehValFrame, text="Override Decel!", width=colWidth, padx=1, relief="raised", command=partial(self.getValCmd,FailureModeRequest.TYPE_DECEL_OVERRIDE))
    valOvrDec.grid(column=3, columnspan=2, row=8, sticky=Tkinter.W+Tkinter.E)

  def load_multi_destList(self, multi_dest_list = None):

    if multi_dest_list is None:
      return []
    
    #load multi-destinations buttons in destinations tab..
    numMultiDestinations = 0
    MultiDestList = []
    for e in multi_dest_list:
      nameIn  = e["name"]
      destsIn = e["dests"]

      MultiDestList.append(MultiSetDest(nameIn, destsIn))
      numMultiDestinations = numMultiDestinations + 1
    
    return MultiDestList


    
  def retrieve_valInput(self):  
    inputValue1=self.valSpdTextbox.get()
    inputValue2=self.valStrTextbox.get()
    inputValue3=self.valAccelTextbox.get()
    inputValue4=self.valStrAngleTextbox.get()
    return float(inputValue1), float(inputValue2), float(inputValue3), float(inputValue4)

  def retrieve_valTypeInput(self):
    inputValue1=self.valSpdSelect.get()
    inputValue2=self.valStrSelect.get()
    return inputValue1, inputValue2

  def getValCmd(self,arg):
      
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
      
      targetSpeed, lateralAcceleration, targetAccel, steeringAngle = self.retrieve_valInput()
      spdSelect, strSelect = self.retrieve_valTypeInput()

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
      publishTeleopCmd = "bash " + self.teleopFolder + "publish-teleop.sh "
      publishTeleopCmd += self.teleopFolder + msg.teleop_filename
      try:
          #os.system(publishTeleopCmd)
          a=1
      except:
          print("Unable to publish teleop path.")
          
    elif arg == FailureModeRequest.TYPE_PATH_SPD_OVERRIDE:
      targetSpeed, lateralAcceleration, targetAccel, steeringAngle = self.retrieve_valInput()

      printPATHSPDparams = "Ovr path spd! "
    
      msg.use_target_speed = True
      msg.target_speed = targetSpeed
      printPATHSPDparams += "target speed: " + str(targetSpeed)
      
      print (printPATHSPDparams)
      
    self.failureModeRequestPub.publish(msg)
  
  def statusToColor(self,status):
    if status == 3:
      return "lightgreen"
    elif status == 2:
      return "orange"
    elif status == 1:
      return "pink"
    else:
      return "#D0D0D0"
  
  def updateSnpText(self,fileTransfer, isConnected):
    
    if not isConnected:
      self.snpTextBox.configure(text=' MQTT Not Connected ')
      return
    
    newText = ''
    if fileTransfer.state[0] == 'Requested' or fileTransfer.state[0] == 'Wait':
      newText = ''.join(fileTransfer.state)
    elif fileTransfer.state[0] == 'Begin':
      newText = 'Snapshot: Ready to send '
    elif fileTransfer.state[0] == 'Sending':
      MB_sent  = int(fileTransfer.bytesSent/1000000)
      MB_total = int(fileTransfer.filesize/1000000)
      newText = 'Snapshot: Sending '+str(MB_sent)+' / '+str(MB_total)+' MB '
    else:
      newText = fileTransfer.state[0]
    
    if newText == 'Idle':
      newText += ', '+str(fileTransfer.snapsSent)+' snaps sent. '
      newText +=      str(fileTransfer.bmapsSent)+' bmaps sent.'
    
    self.snpTextBox.configure(text=newText)
  
  def update(self,subsystems):
    msgText = []
    status_sum = 0 # easy way to see if anything is running
    for s in subsystems:
      for m in s.monitors:
        status_sum += m.status
        m.label.configure(bg=self.statusToColor(m.status))
        textStr = m.name+'\n'+str(m.msgCount)
        m.label.configure(text=textStr)
        if m.displayText == 1 or m.autoText == 1:
          msgText +=m.name+": "+m.msgText+'\n'

      s.startButton.configure(bg=self.statusToColor(s.status))
    
    self.stack_active = (status_sum>0)
    if (msgText==[]):
      msgText = "No status messages to display"
    
    self.textBox.configure(text=''.join(msgText))
    
    self.window.update_idletasks()
    self.window.update()

