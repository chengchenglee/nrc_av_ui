#!/usr/bin/python

import sys
from subsystem import Subsystem
import time

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
    
    self.canvasDrawn = False
    self.tab2_canvas = []
    self.canvasTime = 0
    self.canvasIncr = 10
    
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
    
  def updateCanvas(self):
    if not self.canvasDrawn:
      self.tab2_canvas = Tkinter.Canvas(self.tab2, bg="blue", height=400, width=self.windowWidth)
      self.tab2_canvas.grid(column=0, row=1)
    
    #print('Update canvas:',str(time.time()))
    points = [100, 140, 110, 110, 140, 100, 110, 90, 100, 60, 90, 90, 60, 100, 90, 110]
    for i in range(len(points)):
      points[i] += self.canvasTime
    self.tab2_canvas.create_polygon(points, outline='green', fill='yellow', width=3)
    #self.tab2_canvas.pack()
    
    
    self.canvasTime += self.canvasIncr
    if self.canvasTime >= 200 or self.canvasTime < 0:
      self.canvasIncr *= -1
      
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

