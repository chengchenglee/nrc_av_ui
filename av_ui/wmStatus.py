#!/usr/bin/python

import rospy
from nrc_msgs.msg import TrackedObjectSet
from nrc_msgs.msg import TrackedObject
import numpy as np

# Rounding floats to ints
dataRounder = []
dataRounder.append(100)   # x
dataRounder.append(100)   # y
dataRounder.append(10000) # th
dataRounder.append(100)   # len
dataRounder.append(100)   # width
dataRounder.append(100)   # speed

def dataToStr(object_id,data):
  global dataRounder
  dataStr = ''
  dataStr += str(object_id)
  i=0
  for i in range(len(data)):
    dataStr += ','+str(int(data[i]*dataRounder[i]))
  return dataStr

class WmObject:
  def __init__(self,trackedObject):
    self.object_id = trackedObject.object_id
    self.x = trackedObject.pose.pose.position.x
    self.y = trackedObject.pose.pose.position.y
    q = trackedObject.pose.pose.orientation
    self.th = np.arctan2(2.0 * (q.w*q.z + q.x*q.y),
                         1.0 - 2.0 * (q.y*q.y + q.z*q.z))
    
    c,s = np.cos(self.th), np.sin(self.th)
    
    self.centerPose = np.array(((c, -s, self.x),
                                (s, c,  self.y),
                                (0, 0,  1)))
    
    self.width = trackedObject.shape_parameters.x
    self.length = trackedObject.shape_parameters.y
    self.height = trackedObject.shape_parameters.z
    
    self.backLeftVec  = np.array(((-self.width/2.),
                                  ( self.length/2.),
                                  (1.0)))
    self.backRightPnt = np.dot(self.centerPose,self.backLeftVec)
    
    # Summary Data
    self.data = []
    self.data.append(self.backRightPnt[0])
    self.data.append(self.backRightPnt[1])
    self.data.append(self.th)
    self.data.append(self.length)
    self.data.append(self.width)
    
  def toStr(self):
    return dataToStr(self.object_id,self.data)

class WmStatus:
  def __init__(self):
    self.dgp = []
    self.objs = []
  
  def setDgp(self,data):
    self.dgp = data[:]
    
  def getWmStr(self):
    dataStr = ''
    dataStr += 'a,'+dataToStr(-1,self.dgp)
    for obj in self.objs:
      dataStr += '\no,'+obj.toStr()
    return dataStr
    
  def updateObj(self,oldObs,newObs):
    return WmObject(newObs)
  
  def updateObjs(self,tosMsg):
    
    if True:
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
        newObjs.append(WmObject(newObs))
      
    self.objs = newObjs
