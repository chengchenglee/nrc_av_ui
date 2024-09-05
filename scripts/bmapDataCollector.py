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

class BmapHistRecorder:
  def __init__(self,args):
    self.egoHist = []
    self.objHist = []
    self.prevDgpPose = [0,0,0];
    
    #Vehicle health publisher
    self.healthPub = rospy.Publisher('/bmap_recorder/health_status', DiagnosticArray, queue_size=10)
    self.dataPub   = rospy.Publisher('/bmap_recorder/data', String, queue_size=10)
    
    rospy.Subscriber('/dynamic_global_pose', DynamicPoseWithCovar, self.dgpCallback)
    rospy.Subscriber('/ailsv_tracked_objects', TrackedObjectSet, self.tosCallback)
  
  def addPoint(self,d1,d2):
    dx = d1[0]-d2[0]
    dy = d1[1]-d2[1]
    dist = np.sqrt(dx*dx+dy*dy)
    return dist > 1.0
  
  def addObjPoint(self,d1,d2):
    dx = d1[2]-d2[2]
    dy = d1[3]-d2[3]
    dist = np.sqrt(dx*dx+dy*dy)
    return dist > 1.0
  
  def toObjObs(self,msgObj):
    orientation_list = [msgObj.pose.pose.orientation.x, msgObj.pose.pose.orientation.y,\
                        msgObj.pose.pose.orientation.z, msgObj.pose.pose.orientation.w]
    (roll,pitch,yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    
    xyth = [msgObj.pose.pose.position.x,msgObj.pose.pose.position.y,yaw]
    
    obs = [msgObj.object_id, msgObj.last_observation.to_sec(),\
           round(xyth[0]*100)/100,round(xyth[1]*100)/100,round(xyth[2]*10000)/10000]
    return obs
  
  def tosCallback(self,msg):
    
    foundObj = False
    for msgObj in msg.objects:
      if msgObj.object_id >=10000: continue
      for trkObj in self.objHist:
        if msgObj.object_id == trkObj[0][0]:
          foundObj = True
          objObs = self.toObjObs(msgObj)
          if self.addObjPoint(trkObj[-1],objObs):
            trkObj.append(objObs)
            dx = trkObj[0][2]-objObs[2]
            dy = trkObj[0][3]-objObs[3]
            dist = round(np.sqrt(dx*dx+dy*dy)*10)/10
            
            print('Update obj track:',objObs[0],dist)
          break
      
      if not foundObj:
        objObs = self.toObjObs(msgObj)
        self.objHist.append([objObs])
        print('Add new obj track:',objObs[0])
  
  def dgpCallback(self,msg):
    orientation_list = [msg.pose.orientation.x, msg.pose.orientation.y, msg.pose.orientation.z, msg.pose.orientation.w]
    (roll,pitch,yaw) = tf.transformations.euler_from_quaternion(orientation_list)
    xyth = [msg.pose.position.x,msg.pose.position.y,yaw]
    
    if self.addPoint(self.prevDgpPose,xyth):
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
    
