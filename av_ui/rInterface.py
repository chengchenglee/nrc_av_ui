#!/usr/bin/python

import sys
from subsystem import Subsystem
import time
import numpy as np
import cv2
#from scipy.spatial.transform import Rotation

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
  def __init__(self):
    self.window = []
    self.windowOpen = False
    self.launchAllReq = False
    self.windowWidth  = 550
    self.windowHeight = 700
    self.canvasWidth = 550
    self.canvasHeight = 400
    
    self.tab1 = []
    self.tab2 = []
    self.tab1_frame1 = []
    self.tab2_frame1 = []
    
    self.selectedAgent = 'None'
    #self.canvasDrawn = False
    self.tab2_canvas = []
    self.canvasTime = 0
    self.canvasIncr = 1
    self.camPctTop = 0
    self.camPctIncr = 0.01
    
    self.buttonWidth = 7
  
  def onClosing(self):
    print("OnClosing")
    self.windowOpen = False
    self.window.quit()
  
  def setupWindow(self):
    # Setup window dimensions and title
    self.window = Tkinter.Tk(className='ailsvwindow')
    windowTitle = "SV Remote Interface"
    self.window.title(windowTitle)
    self.window.geometry('550x700')
    self.window.protocol("WM_DELETE_WINDOW", self.onClosing)  # Bind action when window closes

  # Tab def
    tab_control = ttk.Notebook(self.window)
    self.tab1 = Tkinter.Frame(tab_control)
    self.tab2 = Tkinter.Frame(tab_control)
    tab_control.add(self.tab1, text='Agents')
    tab_control.add(self.tab2, text='Teleop')
    tab_control.pack(expand=1, fill='both')

  # Frame def
    tab1_label1 = Tkinter.Label(self.tab1, text="Active Agents")
    tab1_label1.grid(row=1, stick=Tkinter.W)
    self.tab1_frame1 = Tkinter.Frame(self.tab1, width=400, height=50)
    self.tab1_frame1.grid(row=1,columnspan=10, sticky=Tkinter.W)
    
    tab2_label1 = Tkinter.Label(self.tab2, text="Active Agents")
    tab2_label1.grid(row=1, stick=Tkinter.W)
    self.tab2_frame1 = Tkinter.Frame(self.tab2, width=400, height=50)
    self.tab2_frame1.grid(row=1,columnspan=10, sticky=Tkinter.W)
      
    self.windowOpen = True
  
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
  
  def initCanvas(self):
    self.agent_options = ['None']
    self.selectedAgentVal = Tkinter.StringVar(self.tab2);
    self.tab2_agentSel = Tkinter.OptionMenu(self.tab2, self.selectedAgentVal, *self.agent_options, command=self.updateSelectedAgent)
    self.tab2_agentSel.grid(column=0, row=1, sticky=Tkinter.W+Tkinter.E)
    
    self.tab2_canvas = Tkinter.Canvas(self.tab2, bg="white", height=self.canvasHeight, width=self.canvasWidth)
    self.tab2_canvas.grid(column=0, row=2)
  
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
  
  def drawBox(self,wmObj,frame):
    corners = wmObj.cornersInFrame(frame)
    corners2d,_ = cv2.projectPoints(corners,
                                  self.rvec,self.tvec.reshape(-1,1),
                                  self.cMtx,
                                  None)
    bottom = []
    inRange = True
    for i in range(0,4):
      u = self.canvasWidth-corners2d[i,0,0]
      if u < 0 or u > self.canvasWidth or corners2d[i,0,1] < 0 or corners2d[i,0,1] > self.canvasHeight:
        inRange = False
        break
      bottom.append([u])
      bottom.append([corners2d[i,0,1]])
    
    if inRange:
      ship_id = self.tab2_canvas.create_polygon(bottom,  fill='red')
  
  def drawGrid1(self):
    behind = -10
    ahead = 50
    beside = 10
    x_range = np.linspace(behind,ahead,num=ahead-behind)
    y_range = np.linspace(-beside,beside,num=2*beside-1)
    for x in x_range:
      for y in y_range:
        point = np.array([[[x,y,0]]], np.float32)
        point2d,_ = cv2.projectPoints(point,
                                      self.rvec,self.tvec.reshape(-1,1),
                                      self.cMtx,
                                      None)
        r = 2
        self.tab2_canvas.create_oval(point2d[0,0,0]-r,point2d[0,0,1]-r,point2d[0,0,0]+r,point2d[0,0,1]+r)

  
  def drawGrid(self,frame):
    xOffset = frame.centerPose[0,2] - round(frame.centerPose[0,2]/10)*10
    yOffset = frame.centerPose[1,2] - round(frame.centerPose[1,2]/10)*10
    
    gridRange = np.linspace(-80,80,15)
    numPoints = len(gridRange)*len(gridRange)
    gridVec = np.empty((numPoints,3))
    
    blkVal = 0
    whtVal = 255
    blkDist = 60
    whtDist = 80
    
    m = (blkVal-whtVal)/(blkDist-whtDist)
    b = blkVal-blkDist*m
    
    points3d   = np.empty((numPoints,3))
    pointAlpha = np.empty((numPoints))
    k=0
    for i in range(len(gridRange)):
      for j in range(len(gridRange)):
        points3d[k,0] = gridRange[i] - xOffset
        points3d[k,1] = gridRange[j] - yOffset
        points3d[k,2] = 0
        d = gridRange[i]*gridRange[i] + gridRange[j]*gridRange[j]
        pointAlpha[k] = min(whtVal, max(blkVal, m*np.sqrt(d)+b))
        k += 1
    
    points2d,_ = cv2.projectPoints(points3d,
                                   self.rvec,self.tvec.reshape(-1,1),
                                   self.cMtx,
                                   None)
    r=2
    for i in range(len(pointAlpha)):
      intVal = int(pointAlpha[i])
      colorval = "#%02x%02x%02x" % (intVal, intVal, intVal)
      x = self.windowWidth-points2d[i,0,0]
      y = points2d[i,0,1]
      self.tab2_canvas.create_oval(x-r,y-r,x+r,y+r,outline=colorval)
  
  def updateCanvas(self,wmStatus):
    self.tab2_canvas.delete("all")
    
    # Define camera matrix
    fx = 800
    fy = 800
    cx = self.canvasWidth
    cy = self.canvasHeight
    self.cMtx = np.array([[fx, 0, cx/2],
                          [0, fy, cy/2],
                          [1,  0, 1]], np.float32)
    
    
    #height = self.camPctTop*20  + (1-self.camPctTop)*7
    #pitch  = self.camPctTop*-75 + (1-self.camPctTop)*-85
    #self.camPctTop += self.camPctIncr
    #if self.camPctTop < 0:
      #self.camPctIncr =  0.01
    #elif self.camPctTop > 1:
      #self.camPctIncr = -0.01
      
    # Define camera extrinsics
    height =  35
    pitch  = -70
    ypr = [270,0,pitch]
    rotMtx = self.rpyToRot(ypr)

    (rvec,jacobian) = cv2.Rodrigues(rotMtx)
    tvec = np.array([0,0,height],dtype=np.float32)
    self.rvec = rvec
    self.tvec = tvec
    
    # Draw grid
    #self.drawGrid1()
    self.drawGrid(wmStatus.dgp)
    
    # Draw objects
    for obj in wmStatus.objs:
      self.drawBox(obj,wmStatus.dgp)
      
    # Draw ego
    self.drawBox(wmStatus.dgp,wmStatus.dgp)
    
    # Update window
    self.window.update_idletasks()
    self.window.update()
  
  def update(self,monitoredAgents):
    
    # Update teleop selections
    # for option in self.agent_options:
      # m.delete(option)
    
    for a in monitoredAgents:
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
    colIdx = 2
    buttonWidth = 7
    for a in monitoredAgents:
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
              m.button = Tkinter.Button(self.tab1_frame1, text=m.name, width=buttonWidth, padx=1, relief="raised",command=m.select)
            
            if a.selected:
              m.button.grid(column=colIdx, row=rowIdx, sticky=Tkinter.W+Tkinter.E)
              m.button.configure(bg=self.statusToColor(m.status))
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
      colIdx = 2
    self.window.update_idletasks()
    self.window.update()

