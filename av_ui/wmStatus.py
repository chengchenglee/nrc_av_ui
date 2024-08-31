#!/usr/bin/python

import rospy
from nrc_msgs.msg import TrackedObjectSet
from nrc_msgs.msg import TrackedObject
import numpy as np
from numpy.linalg import inv

# Rounding floats to ints
dataRounder = []
dataRounder.append(100)   # x
dataRounder.append(100)   # y
dataRounder.append(10000) # th
dataRounder.append(100)   # len
dataRounder.append(100)   # width
dataRounder.append(100)   # speed

xIdx  = 0
yIdx  = 1
thIdx = 2
wIdx  = 3
lIdx  = 4
vIdx  = 5
objDataLen = 6

cornerOrder = [[-1,-1],[-1,1],[1,1],[1,-1]]

def dataToStr(object_id,data):
  global dataRounder
  dataStr = ''
  dataStr += str(object_id)
  i=0
  for i in range(len(data)):
    dataStr += ','+str(int(data[i]*dataRounder[i]))
  return dataStr

class WmObject:
  def __init__(self,objId,data):
    global xIdx,yIdx,thIdx,wIdx,lIdx,vIdx
    self.object_id = objId
    self.data = data[:]
    self.update(self.data)
    self.avgU = 0
    self.avgV = 0
    
  @classmethod
  def from_trackedObject(cls, trObj):
    global xIdx,yIdx,thIdx,wIdx,lIdx,vIdx
    
    data = np.zeros(6)
    data[xIdx] = trObj.pose.pose.position.x
    data[yIdx] = trObj.pose.pose.position.y
    
    q = trObj.pose.pose.orientation
    data[thIdx] = np.arctan2(2.0 * (q.w*q.z + q.x*q.y),1.0 - 2.0 * (q.y*q.y + q.z*q.z))
    data[lIdx] = trObj.shape_parameters.x
    data[wIdx] = trObj.shape_parameters.y
    data[vIdx] = 0 # Speed
    
    return cls(trObj.object_id,data)
  
  def update(self,data):
    global xIdx,yIdx,thIdx,wIdx,lIdx,vIdx
    c,s = np.cos(data[thIdx]), np.sin(data[thIdx])
    
    self.data = data
    self.centerPose = np.array(((c, -s, data[xIdx]),
                                (s, c,  data[yIdx]),
                                (0, 0,  1)))
    self.poseInv = inv(self.centerPose)
  
  def toStr(self):
    return dataToStr(self.object_id,self.data)
  
  def xyth(self):
    return [self.data[xIdx],self.data[yIdx],self.data[thIdx]]
  
  def cornersInFrame(self,frame):
    pose = np.dot(frame.poseInv,self.centerPose)
    
    cornerVec = np.empty((8,3))
    i=0
    for dz in range(0,2):
      for coord in cornerOrder:
      #for dx in range(-1,2,2):
        #for dy in range(1,2,2):
        pt = np.dot(pose,[coord[0]*self.data[lIdx]/2,coord[1]*self.data[wIdx]/2,1])
        cornerVec[i,:] = pt
        cornerVec[i,2] = dz*2.0
        i += 1
    return cornerVec

class WmStatus:
  def __init__(self):
    global objDataLen
    data = np.zeros(objDataLen)
    self.dgp = WmObject(-1,data)
    self.objs = []
    self.msgCount = 0
  
  def setDgp(self,data):
    global lIdx, wIdx
    data[lIdx] = 3.7
    data[wIdx] = 1.5
    self.dgp.update(data)
    
  def getWmStr(self):
    dataStr = ''
    dataStr += 'a,'+dataToStr(-1,self.dgp.data)
    for obj in self.objs:
      dataStr += '\no,'+obj.toStr()
    return dataStr
    
  def updateObj(self,oldObs,newObs):
    return WmObject.from_trackedObject(newObs)
  
  def updateFromMqtt(self,data):
    global xIdx,yIdx,thIdx,wIdx,lIdx,vIdx
    
    # Clear object list
    oldObjs = self.objs
    self.objs = []
    
    # Parse new payload
    for lineData in data:
      if lineData[0] == 'a':
        objDataCsv = lineData[2:]
        dgpData = np.zeros(objDataLen)
        for i in range(len(objDataCsv)):
          dgpData[i] = float(objDataCsv[i])/dataRounder[i]
        
        dgpData[wIdx] = 1.5
        dgpData[lIdx] = 3.7
        self.dgp = WmObject(-1,dgpData)
        
      # Line relates to observed road users
      if lineData[0] == 'o':
        objId = int(lineData[1])
        objData = np.zeros(objDataLen)
        objDataCsv = lineData[2:]
        for i in range(len(objDataCsv)):
          objData[i] = float(objDataCsv[i])/dataRounder[i]
        self.objs.append(WmObject(objId,objData))
    self.msgCount += 1
    if self.msgCount >= 100: self.msgCount = 1
  
  def updateObjs(self,tosMsg):
    if False:
      newObj = TrackedObject()
      newObj.object_id = 1
      newObj.pose.pose.position.x = 5046.137126332932
      newObj.pose.pose.position.y = -2573.2902247623047
      newObj.pose.pose.position.z = 0.0
      newObj.pose.pose.orientation.x = 0.0
      newObj.pose.pose.orientation.y = 0.0
      newObj.pose.pose.orientation.z = -0.29226166635523215
      newObj.pose.pose.orientation.w = 0.9563383911457612
      newObj.shape_parameters.x = 5.0
      newObj.shape_parameters.y = 2.5
      
      tosMsg.objects = []
      tosMsg.objects.append(newObj)
    
    newObjs = []
    for newObs in tosMsg.objects:
      if 70000 <= newObs.object_id and newObs.object_id < 80000: continue
      
      matchedObj = False
      for oldObs in self.objs:
        if newObs.object_id == oldObs.object_id:
          newObjs.append(self.updateObj(oldObs,newObs))
          matchedObj = True
          break
      
      if not matchedObj:
        newObjs.append(WmObject.from_trackedObject(newObs))
      
    self.objs = newObjs
