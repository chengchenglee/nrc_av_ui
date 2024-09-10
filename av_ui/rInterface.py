#!/usr/bin/python3

import sys, os, subprocess
from subsystem import Subsystem
import time
import numpy as np
from numpy.linalg import inv
import cv2
#from scipy.spatial.transform import Rotation
from wmStatus import WmObject

keyboardListener = True
try:
  from pynput.keyboard import Key, Listener
except:
  print('\n\n\nInstall pynput for keyboard/joystick control of teleop.\n\n\n')
  keyboardListener = False

joystickReader = True
try:
  import pygame
  pygame.init()
except:
  print('pygame module not found, no joystick control')
  # python3 -m pip install -U pygame --user
  # If runtimeError: Unable to run "sdl-config"
  # => sudo apt-get install libsdl2-mixer-dev libsdl2-image-dev libsdl2-ttf-dev
  joystickReader = False

# Display images
import io
try:
  from PIL import Image, ImageTk
except:
  print("Install ImageTk with: sudo apt-get install python3-pil python3-pil.imagetk")

#import av

from msgs.teleop_msg_defs import TeleopEntry

import fcntl

ffmpegExists = True
try:
  import ffmpeg  # pip install ffmpeg-python
  print('rinterface.py: ffmpeg imported.')
except ImportError:
  print('rinterface.py: Could not import ffmpeg.')
  ffmpegExists = False
  
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
    
class virtVeh:
  def __init__(self):
    self.lastUpdate = 0
    self.vv = WmObject(-2,[0,0,0,2,4,0])
  
  #def reset(self,data):
    #self.lastUpdate = time.time()
    #self.x  = data[0]
    #self.y  = data[1]
    #self.th = data[2]
    #self.v  = data[3]
    #self.w  = data[4]
    
    #c,s = np.cos(data[2]), np.sin(data[2])
    #self.centerPose = np.array(((c, -s, data[0]),
                                #(s, c,  data[1]),
                                #(0, 0,  1)))
    #self.poseInv = inv(self.centerPose)
    
  #def move(self,data):
    #dx  = data[0]
    #dth = data[1]
    #c,s = np.cos(dth), np.sin(dth)
    #dPose = np.array(((c, -s, dx),
                      #(s, c,  0),
                      #(0, 0,  1)))
    #self.centerPose = np.dot(self.centerPose,dPose)
    #self.x  = self.centerPose[0,2]
    #self.y  = self.centerPose[1,2]
    #self.th = np.arctan2(self.centerPose[1,0],self.centerPose[0,0])
    
class Interface:
  def __init__(self):
    self.window = []
    self.windowOpen = False
    self.launchAllReq = False
    self.windowWidth  = 550
    self.windowHeight = 930
    self.canvasWidth  = 550
    self.imgHeight    = 268
    self.canvasHeight = 400
    
    self.tab1 = []
    self.tab2 = []
    self.tab1_frame1 = []
    self.tab2_frame1 = []
    self.tab2_frame2 = []
    
    self.selectedAgent = 'None'
    self.isTeleop = False
    self.isRemoteDrv = False
    #self.canvasDrawn = False
    self.tab2_canvas = []
    self.canvasTime = 0
    self.canvasIncr = 1
    self.camPctTop = 0
    self.camPctIncr = 0.01
    self.tab2_img = []
    
    self.mouseclick = [0,0,0,False]
    
    self.buttonWidth = 7
    
    if ffmpegExists:
      if False:
        print('Initialize ffmpeg from python wrapper.')
        self.ffmpegProcess = (ffmpeg
          .input('-')
          .video
          .output('frame_%d.png', vframes=5,pix_fmt='rgb24')
          .run_async(pipe_stdin=True, pipe_stdout=True)
        )
      else:
        command = ['ffmpeg',
          # Input
          #'-s', str(960) + 'x' + str(700),
          '-f','h264',
          '-i','-',  # Comes from a pipe
          # Output
          '-c', 'copy',
          #'-s', str(960) + 'x' + str(700),
          #'-pix_fmt', 'bgr24',
          #'test.mp4'
          'pipe:',   # Goes to a pipe
        ]

        try:
          print(command)
          
          self.ffmpegProcess = subprocess.Popen(command,
                                                stdin=subprocess.PIPE,
                                                stdout=subprocess.PIPE,
                                                stderr=subprocess.STDOUT,
                                                universal_newlines=True)

        
          # make pipe_stdout a non-blocking file
          #fd = self.ffmpegProcess.stdout.fileno()
          #fl = fcntl.fcntl(fd, fcntl.F_GETFL)
          #fcntl.fcntl(fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)
          
          #self.ffmpegOut, _ = self.ffmpegProcess.communicate()
        
          print('FFmpeg process created.')
        except:
          print('Cannot create FFmpeg process.')
  
  def onClosing(self):
    print("OnClosing")
    self.windowOpen = False
    self.window.quit()
  
  def setupWindow(self):
    # Setup window dimensions and title
    self.window = Tkinter.Tk(className='ailsvwindow')
    windowTitle = "SV Remote Interface"
    self.window.title(windowTitle)
    self.window.geometry(str(self.windowWidth)+'x'+str(self.windowHeight))
    self.window.protocol("WM_DELETE_WINDOW", self.onClosing)  # Bind action when window closes

  # Tab def
    self.tab_control = ttk.Notebook(self.window)
    self.tab1 = Tkinter.Frame(self.tab_control)
    self.tab2 = Tkinter.Frame(self.tab_control)
    self.tab_control.add(self.tab1, text='Agents')
    self.tab_control.add(self.tab2, text='Teleop')
    self.tab_control.pack(expand=1, fill='both')

  # Frame def
    tab1_label1 = Tkinter.Label(self.tab1, text="Active Agents")
    tab1_label1.grid(row=1, stick=Tkinter.W)
    self.tab1_frame1 = Tkinter.Frame(self.tab1, width=400, height=50)
    self.tab1_frame1.grid(row=1,columnspan=10, sticky=Tkinter.W)
    
    tab2_label1 = Tkinter.Label(self.tab2, text="Active Agents")
    tab2_label1.grid(row=1, stick=Tkinter.W)
    self.tab2_frame1 = Tkinter.Frame(self.tab2, width=400, height=50)
    self.tab2_frame1.grid(row=1,columnspan=10, sticky=Tkinter.W)
    
    self.tab2_frame2 = Tkinter.Frame(self.tab2, width=400, height=50)
    self.tab2_frame2.grid(row=4,columnspan=10, sticky=Tkinter.W)
      
    self.windowOpen = True
    
    self.teleopCmds = []
  
  def statusToColor(self,status):
    if status == 3:
      return "lightgreen"
    elif status == 2:
      return "orange"
    elif status == 1:
      return "pink"
    else:
      return "#D0D0D0"
  
  def updateSelectedAgent(self, newVal):
    self.selectedAgent = newVal
    self.selectedAgentVal.set(newVal)
    self.teleopCmds = []
    self.isTeleop = 0
    self.enTeleop.configure(text='ENABLE TELEOP')
    self.setDefaultImg()
  
  def setDefaultImg(self):
    pathToDefaultImg = os.path.expanduser('~')+'/projects/nrc_ws/src/nrc_av_ui/av_ui/test1.png'
    self.image = Image.open(pathToDefaultImg)
    self.image2 = self.image.resize((self.canvasWidth,self.imgHeight),Image.ANTIALIAS)
    self.tkImage = ImageTk.PhotoImage(self.image2)
    self.tab2_img.configure(image=self.tkImage)
  
  def initCanvas(self):
    charWidth = 8
    self.agent_options = ['None']
    self.selectedAgentVal = Tkinter.StringVar(self.tab2);
    self.tab2_agentSel = Tkinter.OptionMenu(self.tab2, self.selectedAgentVal, *self.agent_options, command=self.updateSelectedAgent)
    self.tab2_agentSel.grid(column=0, row=1, sticky=Tkinter.W+Tkinter.E)

    widthIn  = self.canvasWidth
    heightIn = 200
    
    self.tab2_img = Tkinter.Label(self.tab2, height=self.imgHeight, width=self.canvasWidth)
    self.setDefaultImg()
    self.tab2_img.grid(column=0, row=2)
    
    self.tab2_canvas = Tkinter.Canvas(self.tab2, bg="white", height=self.canvasHeight, width=self.canvasWidth)
    self.tab2_canvas.grid(column=0, row=3)
    
    numButtons = 5
    self.bWidth = int(self.canvasWidth/(numButtons*charWidth))
    self.enTeleop     = Tkinter.Button(self.tab2_frame2, text='ENABLE TELEOP',\
                                       width=numButtons*self.bWidth+numButtons, height=2, padx=1, pady=1, relief="raised", command=self.setTeleop)
    self.enTeleop.grid(row=0, columnspan=5, sticky=Tkinter.W+Tkinter.E)
    self.enRemoteDrv  = Tkinter.Button(self.tab2_frame2, text='REMOTE DRIVE',\
                                       width=numButtons*self.bWidth+numButtons, height=2, padx=1, pady=1, relief="raised", command=self.setRemoteDrv)
    self.lcLeftButton = Tkinter.Button(self.tab2_frame2, text='LC-LFT',\
                                       width=self.bWidth, height=4, padx=1, pady=1, relief="raised")
    self.gaLeftButton = Tkinter.Button(self.tab2_frame2, text='GA-LFT',\
                                       width=self.bWidth, height=4, padx=1, pady=1, relief="raised",command=self.gaLeft)
    self.followButton = Tkinter.Button(self.tab2_frame2, text='F-TRJ',\
                                       width=self.bWidth, height=4, padx=1, pady=1, relief="raised",command=self.fTrj)
    self.gaRghtButton = Tkinter.Button(self.tab2_frame2, text='GA-RGT',
                                       width=self.bWidth, height=4, padx=1, pady=1, relief="raised",command=self.gaRght)
    self.lcRghtButton = Tkinter.Button(self.tab2_frame2, text='LC-RGT',\
                                       width=self.bWidth, height=4, padx=1, pady=1, relief="raised")
    
    self.virtualVeh = WmObject(-2,[0,0,0,0,0,0,0])

    # Read joystick
    self.joyPad = False
    self.lastJoyUpdate = time.time()
    self.joysticks = []
    if joystickReader:
      print('Init joystick...')
      pygame.joystick.init()
      self.joysticks = [pygame.joystick.Joystick(x) for x in range(pygame.joystick.get_count())]
      for joy in self.joysticks:
        joy.init()
        
    # Read keyboard
    if keyboardListener:
      def on_press(key):
        #print(key)
        if not self.joyPad:
          keyStr = str(key).replace("'","")
          if 'up' in keyStr:
            self.virtualVeh.accel([1,0])
          if 'down' in keyStr:
            self.virtualVeh.accel([-1,0])
          if 'left' in keyStr:
            self.virtualVeh.accel([0,0.3])
          if 'right' in keyStr:
            self.virtualVeh.accel([0,-0.3])

      self.listener = Listener(on_press=on_press)
      print('Start keyboard listener')
      self.listener.start()
    

    
    # Determine the origin by clicking
    def getorigin(eventorigin):
        global x0,y0
        x0 = eventorigin.x
        y0 = eventorigin.y
        self.mouseclick = [0,x0,y0,True]
        print(x0,y0)
    #mouseclick event
    self.tab2_canvas.bind("<Button 1>",getorigin)
  
  def rpyToRot(self,ypr):
    rotZ = np.identity(3)
    rotZ[0,0] = np.cos(ypr[0]*3.14159/180)
    rotZ[0,1] =-np.sin(ypr[0]*3.14159/180)
    rotZ[1,0] = np.sin(ypr[0]*3.14159/180)
    rotZ[1,1] = np.cos(ypr[0]*3.14159/180)
    
    rotX = np.identity(3)
    rotX[1,1] = np.cos(ypr[2]*3.14159/180)
    rotX[1,2] =-np.sin(ypr[2]*3.14159/180)
    rotX[2,1] = np.sin(ypr[2]*3.14159/180)
    rotX[2,2] = np.cos(ypr[2]*3.14159/180)

    rotY = np.identity(3)
    rotY[0,0] = np.cos(ypr[1]*3.14159/180)
    rotY[0,2] =-np.sin(ypr[1]*3.14159/180)
    rotY[2,0] = np.sin(ypr[1]*3.14159/180)
    rotY[2,2] = np.cos(ypr[1]*3.14159/180)
    
    rotMtx = np.dot(rotY, np.dot(rotX,rotZ))
    return rotMtx
  
  def drawBox(self,wmObj,frame,color='red'):
    corners = wmObj.cornersInFrame(frame)
    corners2d,_ = cv2.projectPoints(corners,
                                  self.rvec,self.tvec.reshape(-1,1),
                                  self.cMtx,
                                  None)
    bottom = []
    inRange = True
    avgU = 0
    avgV = 0
    for i in range(0,4):
      u = self.canvasWidth-corners2d[i,0,0]
      v = corners2d[i,0,1]
      if u < 0 or u > self.canvasWidth or v < 0 or v > self.canvasHeight:
        inRange = False
        wmObj.avgU = 0
        wmObj.avgV = 0
        break
      bottom.append([u])
      bottom.append([v])
      avgU = avgU + u/4
      avgV = avgV + v/4
    
    if inRange:
      if wmObj.object_id == -1:
        color = 'grey'
      else:
        for cmd in self.teleopCmds:
          if cmd.objId() == wmObj.object_id:
            if cmd.teleopType == 'ORU':
              color = 'blue'
            elif cmd.teleopType == 'GAL' or cmd.teleopType == 'GAR' or cmd.teleopType == 'FTrj':
              color = 'green'
          
      ship_id = self.tab2_canvas.create_polygon(bottom,  fill=color)
      wmObj.avgU = avgU
      wmObj.avgV = avgV
  
  def drawGrid(self,frame):
    gridSpacing = 5
    numGrids = 5
    
    centerGridX = frame.centerPose[0,2] - (frame.centerPose[0,2] % gridSpacing)
    centerGridY = frame.centerPose[1,2] - (frame.centerPose[1,2] % gridSpacing)
    
    grid_range = np.linspace(-gridSpacing*5,gridSpacing*5,numGrids*2+1)
    numPoints = len(grid_range)**2
    
    # Grey fades farther from AV 
    blkVal = 0
    whtVal = 255
    blkDist = 60
    whtDist = 80
    m = (blkVal-whtVal)/(blkDist-whtDist)
    b = blkVal-blkDist*m
    
    points3d   = np.empty((numPoints,3))
    pointAlpha = np.empty((numPoints))
    k=0
    for i in range(len(grid_range)):
      for j in range(len(grid_range)):
        ptX_global = grid_range[i]+centerGridX
        ptY_global = grid_range[j]+centerGridY
        pt_carFrame = np.dot(frame.poseInv,[ptX_global,ptY_global,1])
        points3d[k,:] = pt_carFrame
        points3d[k,2] = 0.0

        d = points3d[i,0]*points3d[i,0] + points3d[i,1]*points3d[i,1]
        pointAlpha[k] = min(whtVal, max(blkVal, m*np.sqrt(d)+b))
        k += 1
    
    points2d,_ = cv2.projectPoints(points3d,
                                   self.rvec,self.tvec.reshape(-1,1),
                                   self.cMtx,
                                   None)
    dotRadius=2
    for i in range(len(pointAlpha)):
      intVal = int(pointAlpha[i])
      colorval = "#%02x%02x%02x" % (intVal, intVal, intVal)
      x = self.windowWidth-points2d[i,0,0]
      y = points2d[i,0,1]
      self.tab2_canvas.create_oval(x-dotRadius,y-dotRadius,x+dotRadius,y+dotRadius,outline=colorval)
      
  def drawMsgStats(self,stateMsgCount,wmMsgCount,imgMsgCount,kbps):
    
    kbpsStr = str(round(kbps*10/8)/10)
    self.tab2_canvas.create_text(5,10,fill="darkblue",font="Helvetica 10 bold",
                                 text='KBPS: '+kbpsStr,anchor='w')
    self.tab2_canvas.create_text(5,25,fill="darkblue",font="Helvetica 10 bold",
                                 text='STATE: '+str(stateMsgCount),anchor='w')
    self.tab2_canvas.create_text(5,40,fill="darkblue",font="Helvetica 10 bold",
                                 text='WM: '+str(wmMsgCount),anchor='w')
    self.tab2_canvas.create_text(5,55,fill="darkblue",font="Helvetica 10 bold",
                                 text='IMG: '+str(imgMsgCount),anchor='w')
      
  def updateImg(self,imgStreamData):
    if not imgStreamData.unprocessedFrame:
      return
    
    new_image = ''
    if not imgStreamData.isFfmpeg():
      new_image = Image.open(io.BytesIO(imgStreamData.imgPkt))
      scale = float(self.canvasWidth) / float(imgStreamData.width())
      new_image = new_image.resize((int(scale*imgStreamData.width()),int(scale*imgStreamData.height())), Image.BILINEAR)
      imgStreamData.unprocessedFrame = False
    
    elif ffmpegExists:
      self.ffmpegProcess.stdin.write(imgStreamData.ffmpegPkt) # Write stream content to the pipe
      #self.ffmpegProcess.wait()
      #print('Pipe length:',os.fstat(self.ffmpegProcess.stdin))
      #self.ffmpegProcess.stdin.close() # close stdin (flush and send EOF)
      #self.ffmpegProcess.stdin.wait() # close stdin (flush and send EOF)
      #time.sleep(0.2)
      print('Done process frame: ', len(imgStreamData.ffmpegPkt))
      
      in_bytes = ''
      try:
        #in_bytes = self.ffmpegProcess.stdout.readline()
        in_bytes = self.ffmpegProcess.stdout.read(imgStreamData.width() * imgStreamData.height() * 3)
        print('in_bytes: ',len(in_bytes))
      except:
        return
    
      if not in_bytes:
        return
    
      if len(in_bytes) != imgStreamData.width()*imgStreamData.height()*3:
        #print('Wrong image dims.')
        return
    
      in_frame = (
        np
        .frombuffer(in_bytes,np.uint8)
        .reshape([imgStreamData.width(),imgStreamData.height(),3])
      )
  
    self.tkImage = ImageTk.PhotoImage(new_image)
    self.tab2_img.configure(image=self.tkImage)
    
  def processClick(self,wmStatus):
    
    if self.isTeleop == True:
      closestDist = 10000
      closestBox  = -1
      for i in range(len(wmStatus.objs)):
        du = self.mouseclick[1]-wmStatus.objs[i].avgU
        dv = self.mouseclick[2]-wmStatus.objs[i].avgV
        dist = du*du + dv*dv
        if dist < closestDist:
          closestBox = i
          closestDist = dist
      
      if closestBox >= 0 and closestDist < 10*10:
        objExists = False
        
        # Try to see if we're already tracking this object
        for cmd in self.teleopCmds:
          cmdIsOru = (cmd.teleopType == 'ORU' or cmd.teleopType == 'GAL' or cmd.teleopType == 'GAR' or cmd.teleopType == 'FTrj')
          if cmdIsOru:
            if cmd.objId() == wmStatus.objs[closestBox].object_id:
              cmd.setAction('remove')
              objExists = True
              break
            
        # If not, create possible teleop entry for this object
        if not objExists:
          newCmd = TeleopEntry.fromOru(wmStatus.objs[closestBox].object_id, wmStatus.objs[closestBox].xythvw())
          self.teleopCmds.append(newCmd)
        
    # Clear old entries
    self.mouseclick[3] = False
    oldTeleopCmds = self.teleopCmds
    self.teleopCmds = []
    for cmd in oldTeleopCmds:
      if not cmd.teleopType == 'remove':
        self.teleopCmds.append(cmd)
  
  def processJoystick(self):
    self.joyPad = False
    if len(self.joysticks) == 0:
      a=1
      #print('Init joystick...')
      #pygame.joystick.init()
      #self.joysticks = [pygame.joystick.Joystick(x) for x in range(pygame.joystick.get_count())]
      #for joy in self.joysticks:
        #joy.init()
        
    else:
      pygame.event.pump()
      for joy in self.joysticks:
        isJoypad    = 'Microsoft X-Box' in joy.get_name()
        hasSticks   = joy.get_numaxes()    >= 6
        hasButtons  = joy.get_numbuttons() >= 11
        if isJoypad and hasSticks and hasButtons:
          self.joyPad = True
          dt = time.time() - self.lastJoyUpdate
          self.lastJoyUpdate = time.time()
          
          dt = min(0.2,dt)
          
          v1 = 3.5;
          v2 = 10;
          pct1 = 1.0;  # at v1, steering = pct1 * max_steer
          pct2 = 0.05; # at v2, steering = pct2 * max_steer

          m = (pct2 - pct1)/(v2 - v1)
          b = (pct1 - m * v1)
          steerScale = min(pct1, max(pct2, m*self.virtualVeh.speed()+b))
          vScale = 4.5  # joy.get_axis(5) > 0 ==> braking
          
          #print(joy.get_axis(0),joy.get_axis(5))
          self.joySteer = -steerScale*joy.get_axis(0)*0.75;
          self.joyAccel = vScale*joy.get_axis(5) # (Pressed, 1) -> (Released, -1)
          self.joyReset = joy.get_button(2)
          
          self.virtualVeh.accel([dt,self.joyAccel,self.joySteer])
        
          #if False:
            #print('Joy name',joy.get_name())
            #for i in range(joy.get_numaxes()):
              #print('Joy axis',i,joy.get_axis(i))
            #for i in range(joy.get_numbuttons()):
              #print('Joy button',i,joy.get_button(i))
            #for i in range(joy.get_numhats()):
              #print('Joy hat',i,joy.get_hat(i))
  
  def updateCanvas(self,wmStatus,imgStreamData,stateMsgCount,kbps):
    self.tab2_canvas.delete("all")
    
    if self.isTeleop == False:
      self.teleopCmds = []
    
    self.updateImg(imgStreamData)
    
    if joystickReader:
      self.processJoystick()
    
    # Define camera matrix
    fx = 800
    fy = 800
    cx = self.canvasWidth
    cy = self.canvasHeight
    self.cMtx = np.array([[fx, 0, cx/2],
                          [0, fy, cy/2],
                          [1,  0, 1]], np.float32)
    
    frame = wmStatus.dgp
    if self.isRemoteDrv:
      frame = self.virtualVeh
    
    minSpd = 1
    maxSpd = 6
    m = (1.-0.)/(maxSpd-minSpd)
    b = 1. - m*maxSpd
    
    pctTop = min(1., max(0., m*frame.speed()+b))
    height = pctTop*45  + (1-pctTop)*35
    pitch  = pctTop*-75 + (1-pctTop)*-50
    #self.camPctTop += self.camPctIncr
    #if self.camPctTop < 0:
      #self.camPctIncr =  0.01
    #elif self.camPctTop > 1:
      #self.camPctIncr = -0.01
      
      
    if not self.isRemoteDrv:
      height =  35
      pitch  = -70
      
    ypr = [270,0,pitch]
    rotMtx = self.rpyToRot(ypr)

    (rvec,jacobian) = cv2.Rodrigues(rotMtx)
    tvec = np.array([0,0,height],dtype=np.float32)
    self.rvec = rvec
    self.tvec = tvec
    
    # Draw grid
    self.drawGrid(frame)
  
    # Draw other road users
    for obj in wmStatus.objs:
      self.drawBox(obj,frame)
      
    # Draw ego
    self.drawBox(wmStatus.dgp,frame)
    
    # Draw virtual
    if self.isRemoteDrv:
      self.virtualVeh.simulate(0.1)
      self.drawBox(self.virtualVeh,frame,'purple')
    else:
      self.virtualVeh.reset(wmStatus.dgp)
    
    # Draw messaging stats
    self.drawMsgStats(stateMsgCount,wmStatus.msgCount,imgStreamData.msgCount,kbps)
    
    if self.mouseclick[3] == True:
      self.processClick(wmStatus)
    
    # Update window
    self.window.update_idletasks()
    self.window.update()
  
  def update(self,monitoredAgents):
    # Update list of agents available for teleoperation
    for a in monitoredAgents:
      a.wmDisplayOn = 0
      found = False
      for l in self.agent_options:
        if a.name == l:
          found = True
      
      if not found:
        m = self.tab2_agentSel.children['menu']
        self.agent_options.append(a.name)        
        m.add_command(label=a.name,command=Tkinter._setit(self.selectedAgentVal, a.name, self.updateSelectedAgent))      

    
    msgText = []
    rowIdx = 2
    buttonWidth = 7
    for a in monitoredAgents:
      colIdx = 2
      hideInactive = False
      dt = time.time() - a.tLastMsg
      if 2 < dt and dt < 5: print("Agent heartbeat latency:",a.name,dt)
      if dt > 5. and a.drawn:  # Agent no longer active, but should be
        if hideInactive:
          a.button.grid_forget()
          a.cmdsEnabledButton.grid_forget()
          for s in a.subsystems:
            s.button.grid_forget()
            s.stopButton.grid_forget()
            for m in s.monitors:
              m.button.grid_forget()
        else:
          a.button.configure(bg=self.statusToColor(1))
          a.button.grid(column=1, row=rowIdx, sticky=Tkinter.W+Tkinter.E)
          a.cmdsEnabledButton.grid_forget()
          for s in a.subsystems:
            s.button.grid(column=colIdx, row=rowIdx, sticky=Tkinter.W+Tkinter.E)
            colIdx = colIdx + 1
            s.button.configure(bg=self.statusToColor(0))
            s.stopButton.grid_forget()
            for m in s.monitors:
              m.button.grid_forget()
          rowIdx = rowIdx +1
      else:  # Active agent
        if (not a.drawn):
          a.button = Tkinter.Button(self.tab1_frame1, text=a.name, width=buttonWidth*2, padx=1, relief="raised",command=a.select)
          a.cmdsEnabledButton = Tkinter.Button(self.tab1_frame1, text=a.name, width=buttonWidth, padx=1, relief="raised",command=a.setCmds)
        a.button.grid(column=1, row=rowIdx, sticky=Tkinter.W+Tkinter.E)
        a.button.configure(bg=self.statusToColor(0))
        a.cmdsEnabledButton.grid(column=3, row=rowIdx, sticky=Tkinter.W+Tkinter.E)
        a.cmdsEnabledButton.configure(text=a.cmdsMode)
          
        if not a.selected:
          a.cmdsEnabledButton.grid_forget()
        else:
          colIdx = 2
          rowIdx = rowIdx + 1
          
        for s in a.subsystems:
          if (not a.drawn):
            s.button = Tkinter.Button(self.tab1_frame1, text=s.name, width=buttonWidth, padx=1, relief="raised",command=s.select)
          s.button.grid(column=colIdx, row=rowIdx, sticky=Tkinter.W+Tkinter.E)
          colIdx = colIdx + 1
          
          if (not a.drawn):
            s.stopButton = Tkinter.Button(self.tab1_frame1, text="Stop", width=5, padx=1, relief="raised",command=s.stop)
          
          if a.cmdsMode == 'Sync':
            s.stopButton.configure(text="----")
          else:
            if s.isRunning:
              s.stopButton.configure(text="Stop")
            else:
              s.stopButton.configure(text="Start")
          
          if a.selected:
            s.stopButton.grid(column=colIdx, row=rowIdx, sticky=Tkinter.W+Tkinter.E)
            colIdx = colIdx + 1
          else:
            s.stopButton.grid_forget()
          
          minStatus = 3
          for m in s.monitors:
            if (not a.drawn):
              m.button = Tkinter.Button(self.tab1_frame1, text=m.name, width=buttonWidth, padx=1, pady=1, relief="raised",command=m.select)
            
            if a.selected:
              m.button.grid(column=colIdx, row=rowIdx, sticky=Tkinter.W+Tkinter.E)
              m.button.configure(bg=self.statusToColor(m.status))
              textStr = m.name+'\n'+str(m.msgCount)
              m.button.configure(text=textStr)
              m.button.configure(font = ("Helvetica",8))
              colIdx = colIdx + 1
            else:
              m.button.grid_forget()

            minStatus = min(minStatus, m.status)
          
          if a.selected:
            colIdx = 2
            rowIdx = rowIdx + 1
            s.button.configure(bg=self.statusToColor(0))
          else:
            s.button.configure(bg=self.statusToColor(minStatus))
          
        a.drawn = True
        rowIdx += 1
      
    # Teleop Window
    if self.isTeleop:  
      self.enRemoteDrv.grid(column=0, columnspan=5, sticky=Tkinter.W+Tkinter.E)
      self.lcLeftButton.grid(column=0, row=2, sticky=Tkinter.W+Tkinter.E)
      self.gaLeftButton.grid(column=1, row=2, sticky=Tkinter.W+Tkinter.E)
      self.followButton.grid(column=2, row=2, sticky=Tkinter.W+Tkinter.E)
      self.gaRghtButton.grid(column=3, row=2, sticky=Tkinter.W+Tkinter.E)
      self.lcRghtButton.grid(column=4, row=2, sticky=Tkinter.W+Tkinter.E)
    else:
      self.enRemoteDrv.grid_forget()
      self.lcLeftButton.grid_forget()
      self.gaLeftButton.grid_forget()
      self.followButton.grid_forget()
      self.gaRghtButton.grid_forget()
      self.lcRghtButton.grid_forget()

    self.window.update_idletasks()
    self.window.update()

  def setTeleop(self):
    if self.isTeleop:
      self.isTeleop = 0
      self.isRemoteDrv = False
      self.enRemoteDrv.configure(text='ENABLE REMOTE DRIVE')
      self.enTeleop.configure(text='ENABLE TELEOP')
    else:
      self.isTeleop = 1
      self.enTeleop.configure(text='DISABLE TELEOP')
      
  def setRemoteDrv(self):
    if self.isRemoteDrv:
      self.isRemoteDrv = False
      self.enRemoteDrv.configure(text='ENABLE REMOTE DRIVE')
    else:
      self.isRemoteDrv = True
      self.enRemoteDrv.configure(text='DISABLE REMOTE')

  def fTrj(self):
    for cmd in self.teleopCmds:
      if cmd.teleopType == 'ORU':
        cmd.teleopType = 'FTrj'

  def gaLeft(self):
    for cmd in self.teleopCmds:
      if cmd.teleopType == 'ORU':
        cmd.teleopType = 'GAL'
    
  def gaRght(self):
    for cmd in self.teleopCmds:
      if cmd.teleopType == 'ORU':
        cmd.teleopType = 'GAR'
    
  def transferTeleopCmds(self,agent):
    agent.teleopCmdData.commands = []
    for cmd in self.teleopCmds:
      if cmd.teleopType != 'ORU' and cmd.teleopType != 'remove':
        agent.teleopCmdData.commands.append(cmd)
        
    if self.isRemoteDrv:
      newCmd = TeleopEntry.fromOru(-2, self.virtualVeh.xythvw())
      newCmd.teleopType = 'FVV'
      agent.teleopCmdData.commands.append(newCmd)
