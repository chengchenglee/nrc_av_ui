#!/usr/bin/python

import rospy
from nrc_msgs.msg import TrackedObjectSet
from nrc_msgs.msg import TrackedObject
import numpy as np
#from numpy.linalg import inv
from scipy.linalg import inv
import math
import time

POSE_MULT = 1000
ANGLE_MULT = 100000
VEL_MULT = 1000

# Rounding floats to ints
dataRounder = []
dataRounder.append(100)   # x
dataRounder.append(100)   # y
dataRounder.append(10000) # th
dataRounder.append(100)   # width
dataRounder.append(100)   # length
dataRounder.append(100)   # speed
dataRounder.append(10000)  # yawRate
dataRounder.append(1)     # classification

xIdx  = 0
yIdx  = 1
thIdx = 2
wIdx  = 3
lIdx  = 4
vIdx  = 5
yrIdx = 6
clIdx = 7
objDataLen = 8

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
    global xIdx,yIdx,thIdx,wIdx,lIdx,vIdx,yrIdx,clIdx
    self.object_id = objId
    self.data = data[:]
    self.update(self.data)
    self.avgU = 0
    self.avgV = 0
    
  @classmethod
  def from_trackedObject(cls, trObj):
    global xIdx,yIdx,thIdx,wIdx,lIdx,vIdx,clIdx
    
    data = np.zeros(objDataLen)
    data[xIdx] = trObj.pose.pose.position.x
    data[yIdx] = trObj.pose.pose.position.y
    
    q = trObj.pose.pose.orientation
    data[thIdx] = np.arctan2(2.0 * (q.w*q.z + q.x*q.y),1.0 - 2.0 * (q.y*q.y + q.z*q.z))
    data[lIdx] = trObj.shape_parameters.x
    data[wIdx] = trObj.shape_parameters.y
    data[vIdx] = 0 # Speed
    data[clIdx] = trObj.classification
    
    return cls(trObj.object_id,data)
  
  def speed(self):
    return self.data[vIdx]
  
  def update(self,data):
    global xIdx,yIdx,thIdx,wIdx,lIdx,vIdx,clIdx
    c,s = np.cos(data[thIdx]), np.sin(data[thIdx])
    
    self.data = data
    self.centerPose = np.array(((c, -s, data[xIdx]),
                                (s, c,  data[yIdx]),
                                (0, 0,  1)))
    self.poseInv = inv(self.centerPose)
    
  def reset(self,obj):
    self.data = obj.data
    self.centerPose = obj.centerPose
    self.poseInv = obj.poseInv
    
  def accel(self,data):
    dt = data[0]
    self.data[vIdx]  = max(0., min(10., self.data[vIdx] + dt*data[1]))
    length = max(0.5,self.data[lIdx])
    yawRate = self.data[vIdx]*np.tan(data[2]/length)
    self.data[yrIdx] = max(-5, min(5, yawRate))
    
    #print(self.data[vIdx],self.data[yrIdx])
    
  def simulate(self,dt):
    # Update pose
    dx = dt*self.data[vIdx]*np.cos(self.data[thIdx])
    dy = dt*self.data[vIdx]*np.sin(self.data[thIdx])
    dth = dt*self.data[yrIdx]
    self.data[xIdx]  += dx
    self.data[yIdx]  += dy
    self.data[thIdx] += dth
    
    # Recompute transform matrices
    c,s = np.cos(self.data[thIdx]), np.sin(self.data[thIdx])
    self.centerPose = np.array(((c, -s, self.data[xIdx]),
                                (s, c,  self.data[yIdx]),
                                (0, 0,  1)))
    self.poseInv = inv(self.centerPose)
  
  def toStr(self):
    return dataToStr(self.object_id,self.data)
  
  def xyth(self):
    return [self.data[xIdx],self.data[yIdx],self.data[thIdx]]
  
  def xythvw(self):
    return [self.data[xIdx],self.data[yIdx],self.data[thIdx],self.data[vIdx],self.data[yrIdx]]
    
  def toDict(self):
    return {
        'object_id': self.object_id,
        'x': float(self.data[xIdx]),
        'y': float(self.data[yIdx]),
        'th': float(self.data[thIdx]),
        'width': float(self.data[wIdx]),
        'length': float(self.data[lIdx]),
        'speed': float(self.data[vIdx]),
        'yawRate': float(self.data[yrIdx]),
        'classification': int(self.data[clIdx])
    }
  
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
    self.objs  = []
    self.objs2 = []
    self.msgCount = 0
    self.agentMsgCount = 0
    self.pose_mult = 1000
    self.angle_mult = 100000
    self.vel_mult = 1000
    self.tile_mult = 100
    self.z_mult = 1000
    self.flag = False
    self.cloud = []
  
  def setDgp(self,dataIn):
    global xIdx,yIdx,thIdx,wIdx,lIdx,vIdx,yrIdx,clIdx
    data = np.zeros(objDataLen)
    data[xIdx]  = dataIn[0]
    data[yIdx]  = dataIn[1]
    data[thIdx] = dataIn[2]
    data[wIdx]  = 3.7
    data[lIdx]  = 1.5
    data[vIdx]  = dataIn[3]
    data[yrIdx] = dataIn[4]
    data[clIdx] = 5 # Car
    self.dgp.update(data)

  def getWmStr2(self):
    dataStr = ''
    dataStr += 'a,'+dataToStr(-1,self.dgp.data)
    for obj in self.objs:
      dataStr += '\no,'+obj.toStr()
    return dataStr
    
  def updateObj(self,oldObs,newObs):
    return WmObject.from_trackedObject(newObs)
  
  def updateFromMqtt2(self,data):
    # Clear object list
    oldObjs = self.objs
    self.objs = []
    self.cloud = []
    
    # Parse new payload
    for lineData in data:
      if lineData[0] == 'a':
        #print(lineData)
        objDataCsv = lineData[2:]
        dgpData = np.zeros(objDataLen)
        for i in range(len(objDataCsv)):
          dgpData[i] = float(objDataCsv[i])/dataRounder[i]
        
        dgpData[wIdx]  = 1.5
        dgpData[lIdx]  = 3.7
        dgpData[clIdx] = 5 # Car
        self.dgp = WmObject(-1,dgpData)
        
      # Line relates to observed road users
      if lineData[0] == 'o':
        objId = int(lineData[1])
        objData = np.zeros(objDataLen)
        objDataCsv = lineData[2:]
        for i in range(len(objDataCsv)):
          objData[i] = float(objDataCsv[i])/dataRounder[i]
        self.objs.append(WmObject(objId,objData))
        
      # Line relates to observed road users
      if lineData[0] == 't':
        tileLengthInt, tileDivInt, numTiles, numPixelsPerTileSide, maxCount, centerXInt, centerYInt = map(int, lineData[1:])
        self.tileLength = tileLengthInt / self.tile_mult
        self.tileDiv = tileDivInt / self.tile_mult
        self.numTiles = numTiles
        self.numPixelsPerTileSide = numPixelsPerTileSide
        self.maxCount = maxCount
        self.centerX = centerXInt / self.tile_mult
        self.centerY = centerYInt / self.tile_mult
        #print('New Tile (Length/Div/NumTiles/CenterX/CenterY):',self.tileLength,self.tileDiv,self.numTiles,self.centerX,self.centerY)

      if lineData[0] == 'd':
        minXInt, minYInt = map(int, lineData[1:3])
        minX = minXInt / self.tile_mult
        minY = minYInt / self.tile_mult
        
        for i in range(3, len(lineData), 4):
          if i + 3 < len(lineData):
            i_val, j_val, pctStatic, zValueInt = map(int, lineData[i:i+4])
            x = minX + i_val * self.tileDiv + self.tileDiv / 2.0
            y = minY + j_val * self.tileDiv + self.tileDiv / 2.0
            zValue = zValueInt / self.z_mult
            self.cloud.append((x, y, zValue))
      
    self.msgCount += 1
    if self.msgCount >= 100: self.msgCount = 1
    
  #def updateFromMqtt(self, data):
    #print(data)
    #oldObjs = self.objs
    #self.objs = []
    #self.t = []
    #self.cloud = []
    
    #if isinstance(data, list) and len(data) > 1:
        #a_element = next((item for item in data if item[0].startswith('a')), None)
        #o_element = next((item for item in data if item[0].startswith('o')), None)
        #t_element = next((item for item in data if item[0].startswith('t')),None)
        #d_elements = [item[0].split() for item in data if item[0].startswith('d')]

        #if a_element:
            #a = a_element[0].split()
            #dgpData = np.zeros(objDataLen)
            

            
            #x = float(a[1]) / self.pose_mult
            #y = float(a[2]) / self.pose_mult
            #yaw = float(a[3]) / self.angle_mult
            
            #dgpData[xIdx] = x
            #dgpData[yIdx] = y
            #dgpData[thIdx] = yaw
            #dgpData[wIdx] = 1.5
            #dgpData[lIdx] = 3.7
            #dgpData[vIdx] = 0
            
            #self.dgp = WmObject(-1, dgpData)
            ## print(f"Processed 'a': x={x:.3f}, y={y:.3f}, yaw={yaw:.5f}")
        
        #if o_element:
            #o = o_element[0].split()
            #num_objects = int(o[1])
            ## print(f"Number of objects: {num_objects}")
            
            #for i in range(2, num_objects + 2):
                #if i < len(data):
                    #obj_data = data[i][0].split()
                    #if len(obj_data) >= 14:
                        #obj_id = int(obj_data[0])
                        #x = float(obj_data[1]) / self.pose_mult
                        #y = float(obj_data[2]) / self.pose_mult
                        #z = float(obj_data[3]) / self.pose_mult
                        #yaw = float(obj_data[4]) / self.angle_mult
                        #shape_x = float(obj_data[5]) / 1
                        #shape_y = float(obj_data[6]) / 1
                        #shape_z = float(obj_data[7]) / 1
                        #vel_x = float(obj_data[8]) / self.vel_mult
                        #vel_y = float(obj_data[9]) / self.vel_mult
                        #vel_z = float(obj_data[10]) / self.vel_mult


                        #objId = obj_id
                        #objData = np.zeros(objDataLen)
                        #objData[xIdx] = x
                        #objData[yIdx] = y
                        #objData[thIdx] = yaw
                        #objData[wIdx] = shape_y
                        #objData[lIdx] = shape_x
                        #objData[vIdx] = math.sqrt(vel_x**2 + vel_y**2) 

                        #self.objs.append(WmObject(objId,objData))

        #if t_element:
          #t_element = t_element[0]. split()
          #tileLengthInt, tileDivInt, numTiles, numPixelsPerTileSide, maxCount, centerXInt, centerYInt = map(int, t_element[1:])
          #self.tileLength = tileLengthInt / self.tile_mult
          #self.tileDiv = tileDivInt / self.tile_mult
          #self.numTiles = numTiles
          #self.numPixelsPerTileSide = numPixelsPerTileSide
          #self.maxCount = maxCount
          #self.centerX = centerXInt / self.tile_mult
          #self.centerY = centerYInt / self.tile_mult
          ## print(f"Processed 't': tileLength={self.tileLength}, tileDiv={self.tileDiv}, numTiles={self.numTiles}, centerX={self.centerX}, centerY={self.centerY}")


        #if d_elements:
            #for d_element in d_elements:
                #minXInt, minYInt = map(int, d_element[1:3])
                #minX = minXInt / self.tile_mult
                #minY = minYInt / self.tile_mult
                
                #for i in range(3, len(d_element), 4):
                    #if i + 3 < len(d_element):
                        #i_val, j_val, pctStatic, zValueInt = map(int, d_element[i:i+4])
                        #x = minX + i_val * self.tileDiv + self.tileDiv / 2.0
                        #y = minY + j_val * self.tileDiv + self.tileDiv / 2.0
                        #zValue = zValueInt / self.z_mult
                        #self.cloud.append((x, y, zValue))
            
            ## print(f"Processed 'd': Added {len(self.cloud)} points to the point cloud")
           
        
        #if not a_element and not o_element:
            #print("No 'a' or 'o' elements found in the data")
    #else:
        #print("Unexpected data format")

  def toDict(self):
    return {
        'dgp': self.dgp.toDict(),
        'objects': [obj.toDict() for obj in self.objs],
        'msgCount': self.msgCount,
        'agentMsgCount': self.agentMsgCount,
        'cloud': [{'x': x, 'y': y, 'z': z} for x, y, z in self.cloud] if self.cloud else []
    }
    
  def updateObjs(self,tosMsg):
    #if False:
      #newObj = TrackedObject()
      #newObj.object_id = 1
      #newObj.pose.pose.position.x = 5046.137126332932
      #newObj.pose.pose.position.y = -2573.2902247623047
      #newObj.pose.pose.position.z = 0.0
      #newObj.pose.pose.orientation.x = 0.0
      #newObj.pose.pose.orientation.y = 0.0
      #newObj.pose.pose.orientation.z = -0.29226166635523215
      #newObj.pose.pose.orientation.w = 0.9563383911457612
      #newObj.shape_parameters.x = 5.0
      #newObj.shape_parameters.y = 2.5
      
      #tosMsg.objects = []
      #tosMsg.objects.append(newObj)
        
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
