#!/usr/bin/env python

# Ros  Messages
import rospy
import time
from geometry_msgs.msg import *
import tf

# Image display
import os

class SetDest:
  def __init__(self, destNameIn, posXIn, posYIn, posThIn):
    self.destName = destNameIn
    self.posX = posXIn
    self.posY = posYIn
    self.posTh = posThIn
    self.advertised = False
    
  def command(self):
    print("Send destination: ", self.destName)
    
    if self.advertised == False:
      self.publisher = rospy.Publisher("/move_base_simple/goal",PoseStamped,queue_size=1)
      self.advertised = True
    
    msg = PoseStamped()
    msg.header.frame_id = "site"
    msg.header.stamp = rospy.Time.now()
    msg.pose.position.x = self.posX
    msg.pose.position.y = self.posY
    
    quaternion = tf.transformations.quaternion_from_euler(0, 0, self.posTh)
    msg.pose.orientation.x = quaternion[0]
    msg.pose.orientation.y = quaternion[1]
    msg.pose.orientation.z = quaternion[2]
    msg.pose.orientation.w = quaternion[3]
    
    self.publisher.publish(msg)
        
