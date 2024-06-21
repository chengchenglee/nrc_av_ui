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
    agent_options = ['None','Sim_Agent']
    self.selectedAgentVal = Tkinter.StringVar(self.tab2);
    self.tab2_agentSel = Tkinter.OptionMenu(self.tab2, self.selectedAgentVal, *agent_options, command=self.updateSelectedAgent)
    self.tab2_agentSel.grid(column=0, row=1, sticky=Tkinter.W+Tkinter.E)
    
    self.tab2_canvas = Tkinter.Canvas(self.tab2, bg="white", height=400, width=self.windowWidth)
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
  
  #def getCamMtx(self,pitch,height):
    
  
  def drawBox(self,wmObj,frame):
    corners = wmObj.cornersInFrame(frame)
    corners2d,_ = cv2.projectPoints(corners,
                                  self.rvec,self.tvec.reshape(-1,1),
                                  self.cMtx,
                                  None)
    bottom = []
    for i in range(0,4):
      bottom.append([self.windowWidth-corners2d[i,0,0]])
      bottom.append([corners2d[i,0,1]])
    
    ship_id = self.tab2_canvas.create_polygon(bottom,  fill='red')
    
  
  def updateCanvas(self,wmStatus):
    self.tab2_canvas.delete("all")
    
    # Define camera matrix
    fx = 800
    fy = 800
    cx = self.windowWidth
    cy = 400
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
    
    # Grid
    if False:
      u_range = np.linspace(-10,10)
      v_range = np.linspace(-10,10)
      numPoints = len(u_range)
      u,v = np.meshgrid(u_range,v_range)
      x = u
      y = v
      z = 0*u
      points3d = np.stack([x,y,z],axis=-1).reshape(-1,3)
      points2d, _ = cv2.projectPoints(points3d,
                                      self.rvec,self.tvec.reshape(-1,1),
                                      self.cMtx,
                                      None)
      dotSize = np.ones(numPoints)
      for i in range(numPoints):
        r = 2
        self.tab2_canvas.create_oval(points2d[i,0,0]-r,points2d[i,0,1]-r,points2d[i,0,0]+r,points2d[i,0,1]+r)
    else:
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
    
    for obj in wmStatus.objs:
      self.drawBox(obj,wmStatus.dgp)
      
    self.drawBox(wmStatus.dgp,wmStatus.dgp)
    self.window.update_idletasks()
    self.window.update()
  
  def update(self,monitoredAgents):    
    msgText = []
    rowIdx = 2
    colIdx = 2
    buttonWidth = 7
    hideInactive = False
    for a in monitoredAgents:
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
    
    self.window.update_idletasks()
    self.window.update()

