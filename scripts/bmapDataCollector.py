#!/usr/bin/env python

import rospy
import argparse
from std_msgs.msg import String
from diagnostic_msgs.msg import *
import numpy as np
from nrc_msgs.msg import CtrlStateFLG
from nrc_msgs.msg import CANVReader
from nrc_msgs.msg import DriverInput
from nrc_msgs.msg import DynamicPoseWithCovar, GpsState, TrackedObject, TrackedObjectSet
import tf.transformations

import time
import subprocess
import os
from collections import deque

class ObjObs:
  def __init__(self,tNow,msg,egoX,egoY):
    orientation_list = [msg.pose.pose.orientation.x, msg.pose.pose.orientation.y,\
                        msg.pose.pose.orientation.z, msg.pose.pose.orientation.w]
    (roll,pitch,yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    
    self.t   = tNow
    self.objId  = msg.object_id
    self.classification = msg.classification
    self.l   = round(msg.shape_parameters.x*10)/10
    self.w   = round(msg.shape_parameters.y*10)/10
    
    dx = egoX-msg.pose.pose.position.x
    dy = egoY-msg.pose.pose.position.y
    self.r   = round(np.sqrt(dx*dx + dy*dy)*100)/100
    self.x   = round(msg.pose.pose.position.x*100)/100
    self.y   = round(msg.pose.pose.position.y*100)/100
    self.th  = round(yaw*10000)/10000

class BmapHistRecorder:
  def __init__(self,args):
    self.egoHist = []
    self.objHist = []
    self.prevDgpPose = [0,0,0];
    self.turnSigState = 0
    self.tTurnSigState = 0
    self.avEngaged = 0
    self.egoX  = 0
    self.egoY  = 0
    self.egoTh = 0
    self.posFixInd = 5 # default RTK float
    self.HDOP = 2      # default 2m
    self.msgVersion = 1.1
    
    # Version 1.1: Add gps fix, gps HDOP
    
    # Places where we don't want to record
    self.exclPoses = []
    self.exclPoses.append([4870.25,-2212.87,0.0194033,75.0,17.0])  #SVPG
    self.inExclusionZone = True
    
    self.exclPoseInvs = []
    for point in self.exclPoses:
      exclPose = np.zeros((3,3))
      exclPose[0,0] =  np.cos(point[2])
      exclPose[0,1] =  np.sin(point[2])
      exclPose[1,0] = -exclPose[0,1]
      exclPose[1,1] =  exclPose[0,0]
      exclPose[2,2] =  1
      exclPose[0,2] = point[0]
      exclPose[1,2] = point[1]
      self.exclPoseInvs.append([np.linalg.inv(exclPose),point[3],point[4]])
    
    self.diagMsg = DiagnosticArray()
    diagStatus = DiagnosticStatus()
    self.diagMsg.status.append(diagStatus)
    
    #Vehicle health publisher
    self.healthPub = rospy.Publisher('/bmap_recorder/health', DiagnosticArray, queue_size=10)
    self.dataPub   = rospy.Publisher('/bmap_recorder/data', String, queue_size=10)
    
    rospy.Subscriber('/gps_state/dynamic_global_pose_oxts_10hz', DynamicPoseWithCovar, self.dgpCallback)
    rospy.Subscriber('/gps_state/gps_state_oxts_2hz', GpsState, self.gpsStateCallback)
    rospy.Subscriber('/pc_processor/multi_object_tracker/tracked_object_set', TrackedObjectSet, self.tosCallback)
    rospy.Subscriber('/CAN_V_reader', CANVReader, self.CanVCallback)
    rospy.Subscriber('/CtrlStateFLG', CtrlStateFLG, self.ctrlStateCallback)
    
    # Create a ROS Timer for reading data
    rospy.Timer(rospy.Duration(0.5), self.timerCallback)
    
  def timerCallback(self,data):
    statusStr =  's,3\n'
    statusStr += 'r,10\n'
    self.diagMsg.header.stamp = rospy.Time.now()
    self.diagMsg.status[-1].message = statusStr
    self.healthPub.publish(self.diagMsg)
  
  def addPoint(self,d1,d2):
    dx = d1[0]-d2[0]
    dy = d1[1]-d2[1]
    dist = np.sqrt(dx*dx+dy*dy)
    return dist > 1.0
  
  def addObjPoint(self,d1,d2):
    dx = d1.x-d2.x
    dy = d1.y-d2.y
    dist = np.sqrt(dx*dx+dy*dy)
    return dist > 1.0
  
  def toString(self,trkObj):
    if len(trkObj) < 3: return ''
  
    # Get average length/width
    length = 0
    width  = 0
    classCount = np.zeros(8)
    currMax = 0
    for obs in trkObj:
      length += obs.l
      width += obs.w
      classCount[obs.classification] += 1
      if classCount[obs.classification] > classCount[currMax]:
        currMax = obs.classification
    length = round( (length / max(1,len(trkObj)) )*10)/10
    width  = round( (width  / max(1,len(trkObj)) )*10)/10
  
    # Unknown classification, return blank
    if currMax < 3: return ''
  
    tZero = trkObj[0].t
    
    objStr = 'obj,t,id,c,l,w,dt,r,x,y,th,'
    objStr += str(tZero)+','+str(trkObj[0].objId)+','+str(currMax)+','
    objStr += str(length)+','+str(width)
    for obs in trkObj:
      if obs.r > 200: return ''
      objStr += ','+str(round((obs.t-tZero)*100)/100)+','+str(obs.r)+\
                ','+str(obs.x)+','+str(obs.y)+','+str(obs.th)
    objStr += '\n'
    return objStr
  
  def tosCallback(self,msg):
    tNow = msg.header.stamp.to_sec()
    
    for msgObj in msg.objects:
      if msgObj.object_id >=10000: continue
      if msgObj.classification < 3: continue
      foundObj = False
      for trkObj in self.objHist:
        if msgObj.object_id == trkObj[0].objId:
          foundObj = True
          objObs = ObjObs(tNow,msgObj,self.egoX,self.egoY)
          
          if self.addObjPoint(trkObj[0],objObs):
            trkObj.append(objObs)
            #dx = trkObj[0].x-objObs.x
            #dy = trkObj[0].y-objObs.y
            #dist = round(np.sqrt(dx*dx+dy*dy)*10)/10
            #print('Update obj track:',objObs.objId,dist)
          break
      
      if not foundObj:
        objObs = ObjObs(tNow,msgObj,self.egoX,self.egoY)
        self.objHist.append([objObs])
        #print('Add new obj track:',objObs.objId)
        
    # Check if delete or publish object track
    oldTracks = self.objHist
    self.objHist = []
    objStr = 'v,'+str(self.msgVersion)+'\n'
    publishString = False
    for trkObj in oldTracks:
      dt = tNow - trkObj[-1].t
      if dt > 2.0:
        dx = trkObj[0].x - trkObj[-1].x
        dy = trkObj[0].y - trkObj[-1].y
        dist = np.sqrt(dx*dx + dy*dy)
        if dist > 20.:
          objStr += self.toString(trkObj)
          publishString = True
      else:
        self.objHist.append(trkObj)
    
    # Publish data
    if publishString:
      #print('Publish objects',objStr)
      dataMsg = String()
      dataMsg.data = objStr
      self.dataPub.publish(dataMsg)
  
  def updateExclZone(self,msg):
    # Check if we're in an exclusion zone
    self.inExclusionZone = False
    #for point in self.exclPoses:
      #exclPose = np.zeros((3,3))
      #exclPose[0,0] =  np.cos(point[2])
      #exclPose[0,1] =  np.sin(point[2])
      #exclPose[1,0] = -exclPose[0,1]
      #exclPose[1,1] =  exclPose[0,0]
      #exclPose[2,2] =  1
      #exclPose[0,2] = point[0]
      #exclPose[1,2] = point[1]
      #exclPoseInv = np.linalg.inv(exclPose)
      
    for invPose in self.exclPoseInvs:
      
      egoPoint = np.zeros((3,1))
      egoPoint[0,0] = msg.pose.position.x
      egoPoint[1,0] = msg.pose.position.y
      egoPoint[2,0] = 1
      
      relPoint = np.dot(invPose[0],egoPoint)
      if abs(relPoint[0,0]) < invPose[1] and abs(relPoint[1,0]) < invPose[2]:
        self.inExclusionZone = True
        print('In exclusion zone',round(relPoint[0,0]*10)/10,round(relPoint[1,0]*10)/10)
  
  def dgpCallback(self,msg):
    # Places we don't want to record
    self.updateExclZone(msg)

    orientation_list = [msg.pose.orientation.x, msg.pose.orientation.y, msg.pose.orientation.z, msg.pose.orientation.w]
    (roll,pitch,yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    xyth = [msg.pose.position.x,msg.pose.position.y,yaw]
    
    self.egoX  = msg.pose.position.x
    self.egoY  = msg.pose.position.y
    self.egoTh = yaw
    
    if self.addPoint(self.prevDgpPose,xyth):
      #print('Add dgp',msg.header.stamp.to_sec())
      spd = msg.twist.linear.x*msg.twist.linear.x + msg.twist.linear.y*msg.twist.linear.y
      spd = round(np.sqrt(spd)*10)/10
      yawRate = round(msg.twist.angular.z*100)/100
      dataMsg = String()
      
      if self.inExclusionZone == False:
        dataMsg.data = 'v,'+str(self.msgVersion)+'\n'
        dataMsg.data += 'ego,t,avOn,turnSig,x,y,th,v,w,fix,hdop,'
        dataMsg.data += str(msg.header.stamp.to_sec())+','
        dataMsg.data += str(self.avEngaged)+','+str(self.turnSigState)+','
        dataMsg.data += str(round(xyth[0]*100)/100)+','+str(round(xyth[1]*100)/100)+','+str(round(xyth[2]*10000)/10000)+','
        dataMsg.data += str(spd)+','+str(yawRate)+','
        dataMsg.data += str(self.posFixInd)+','+str(self.HDOP)+','
        self.dataPub.publish(dataMsg)
      self.prevDgpPose = xyth
      
  def gpsStateCallback(self,msg):
    self.posFixInd = msg.Pos_Fix_ind
    self.HDOP = msg.HDOP
      
  def CanVCallback(self,msg):
    tNow = time.time()
    
    if msg.TurnSignals == 0 and self.turnSigState > 0 and tNow - self.tTurnSigState > 1.2:
      # Clear turn signal flag
      self.turnSigState = 0
      
    elif (msg.TurnSignals > 0):
      self.turnSigState = msg.TurnSignals
      self.tTurnSigState = tNow
  
  def ctrlStateCallback(self,msg):
    if msg.Engaged == True:
      self.avEngaged = 1
    else:
      self.avEngaged = 0
 
if __name__ == '__main__':
    print ('Starting Bmap Recorder node.')
    rospy.init_node('BmapRecorder')
    
    # Parse arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('-e', '--checkEngaged', default=True)
    parser.add_argument('-c', '--car', default="Foxtrot")
    args, uargs = parser.parse_known_args()
    
    recorder = BmapHistRecorder(args)
    
    while not rospy.is_shutdown():
      time.sleep(0.005)
    
#class objHist:
  #def __init__(self,objIdIn):
    #self.objId = objIdIn
    #self.data = []
    
  #def addData(self,dataIn):
    #self.data.append(dataIn)

#class LlNode:
  #def __init__(self,dataIn):
    #self.data = dataIn
    #self.next = None

#class LinkedList:
  #def __init__(self):
      #self.head = None
      #self.size = 0
  
  #def get(self,key):
    #temp = self.head
    #while (temp is not None):
      #if temp.data[0] == key:
        #break
      #temp = temp.next
    #return temp
      
  #def add(self,newData):
    #newNode = LlNode(newData)
    #newNode.next = self.head
    #self.head = newNode
    #self.size += 1
  
  #def remove(self,key):
    #temp = self.head
    
    ## If head node itself is the one to be deleted
    #if (temp is not None):
      #if (temp.data[0] == key):
        #self.head = temp.next
        #temp = None
        #return
    
    #while (temp is not None):
      #if temp.data[0] == key:
        #break
      #prev = temp
      #temp = temp.next
      
    #if(temp == None):
      #return
    #prev.next = temp.next
    #temp = None
    
