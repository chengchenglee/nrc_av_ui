#!/usr/bin/env python

import rospy
import argparse
from std_msgs.msg import String
from diagnostic_msgs.msg import *
import numpy as np
from nrc_msgs.msg import CtrlStateFLG
from nrc_msgs.msg import CANVReader
from nrc_msgs.msg import DriverInput
from nrc_msgs.msg import DynamicPoseWithCovar, TrackedObject, TrackedObjectSet
import tf.transformations

import time
import subprocess
import os
from collections import deque

class ObjObs:
  def __init__(self,tNow,msg):
    orientation_list = [msg.pose.pose.orientation.x, msg.pose.pose.orientation.y,\
                        msg.pose.pose.orientation.z, msg.pose.pose.orientation.w]
    (roll,pitch,yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    
    self.t   = tNow
    self.objId  = msg.object_id
    self.classification = msg.classification
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
    
    #Vehicle health publisher
    self.healthPub = rospy.Publisher('/bmap_recorder/health_status', DiagnosticArray, queue_size=10)
    self.dataPub   = rospy.Publisher('/bmap_recorder/data', String, queue_size=10)
    
    rospy.Subscriber('/dynamic_global_pose', DynamicPoseWithCovar, self.dgpCallback)
    rospy.Subscriber('/pc_processor/multi_object_tracker/tracked_object_set', TrackedObjectSet, self.tosCallback)
    rospy.Subscriber('/CAN_V_reader', CANVReader, self.CanVCallback)
  
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
  
  #def toObjObs(self,tNow,msgObj):
    #orientation_list = [msgObj.pose.pose.orientation.x, msgObj.pose.pose.orientation.y,\
                        #msgObj.pose.pose.orientation.z, msgObj.pose.pose.orientation.w]
    #(roll,pitch,yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    
    #xyth = [msgObj.pose.pose.position.x,msgObj.pose.pose.position.y, yaw]
    
    #obs = [msgObj.object_id, tNow, msgObj.classification
           #round(xyth*100)/100,round(xyth[1]*100)/100,round(xyth[2]*10000)/10000]
    #return obs
  
  def toString(self,trkObj):
    if len(trkObj) < 3: return ''
  
    tZero = trkObj[0].t
    
    objStr = 'obj,'+str(tZero)+','+str(trkObj.objId
    for obs in trkObj:
      objStr += ','+str(round((obs.t-tZero)*100)/100)+\
                ','+str(obs.x)+','+str(obs.y)+','+str(obs.th)
    objStr += '\n'
    return objStr
  
  def tosCallback(self,msg):
    tNow = msg.header.stamp.to_sec()
    
    for msgObj in msg.objects:
      if msgObj.object_id >=10000: continue
      foundObj = False
      for trkObj in self.objHist:
        if msgObj.object_id == trkObj[0].objId:
          foundObj = True
          objObs = ObjObs(tNow,msgObj)
          
          if self.addObjPoint(trkObj[0],objObs):
            trkObj.append(objObs)
            dx = trkObj[0].x-objObs.x
            dy = trkObj[0].y-objObs.y
            dist = round(np.sqrt(dx*dx+dy*dy)*10)/10
            
            print('Update obj track:',objObs.objId,dist)
          break
      
      if not foundObj:
        objObs = ObjObs(tNow,msgObj)
        self.objHist.append([objObs])
        print('Add new obj track:',objObs.objId)
        
    # Check if delete or publish object track
    oldTracks = self.objHist
    self.objHist = []
    objStr = ''
    for trkObj in oldTracks:
      dt = tNow - trkObj[-1].t
      if dt > 2.0:
        dx = trkObj[0].x - trkObj[-1].x
        dy = trkObj[0].y - trkObj[-1].y
        dist = np.sqrt(dx*dx + dy*dy)
        if dist > 20.:
          objStr += self.toString(trkObj)
      else:
        self.objHist.append(trkObj)
    print('Tracking objects:',len(self.objHist))
    print('')
    
    # Publish data
    if len(objStr) > 0:
      print('Publish objects',objStr)
      dataMsg = String()
      dataMsg.data = objStr
      self.dataPub.publish(dataMsg)
  
  def dgpCallback(self,msg):
    orientation_list = [msg.pose.orientation.x, msg.pose.orientation.y, msg.pose.orientation.z, msg.pose.orientation.w]
    (roll,pitch,yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    xyth = [msg.pose.position.x,msg.pose.position.y,yaw]
    
    if self.addPoint(self.prevDgpPose,xyth):
      print('Add dgp')
      spd = msg.twist.linear.x*msg.twist.linear.x + msg.twist.linear.y*msg.twist.linear.y
      spd = round(np.sqrt(spd)*10)/10
      yawRate = round(msg.twist.angular.z*100)/100
      dataMsg = String()
      
      dataMsg.data = 'ego,'
      dataMsg.data += str(msg.header.stamp.to_sec())+','
      dataMsg.data += str(round(xyth[0]*100)/100)+','+str(round(xyth[1]*100)/100)+','+str(round(xyth[2]*10000)/10000)+','
      dataMsg.data += str(spd)+','+str(yawRate)
      self.dataPub.publish(dataMsg)
      self.prevDgpPose = xyth
      
  def CanVCallback(self,msg):
    tNow = time.time()
    
    if msg.TurnSignals == 0 and self.turnSigState > 0 and tNow - self.tTurnSigState > 1.2:
      # Clear turn signal flag
      self.turnSigState = 0
      
    elif (msg.TurnSignals > 0):
      self.turnSigState = msg.TurnSignals
      
    self.tTurnSigState = tNow
 
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
    
