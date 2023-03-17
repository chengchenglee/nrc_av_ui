#!/usr/bin/env python

# Ros Messages
import rospy
import time
from geometry_msgs.msg import Pose
from nrc_msgs.msg import MODIARoutePlanDestinations
import tf

# Image display
import os

class MultiSetDest:
  def __init__(self, multiDestNameIn, destsIn):
    self.multiDestName = multiDestNameIn
    self.dests = destsIn
    self.advertised = False

  def command(self):
    print("Send destinations: ", self.multiDestName)

    if self.advertised == False:
      self.publisher = rospy.Publisher("/modia/route_plan/destinations", MODIARoutePlanDestinations, queue_size=1)
      self.advertised = True

    msg = MODIARoutePlanDestinations()
    msg.header.frame_id = "site"
    msg.header.stamp = rospy.Time.now()

    for dest in self.dests:
      newDest = Pose()

      newDest.position.x = dest["posX"]
      newDest.position.y = dest["posY"]

      quaternion = tf.transformations.quaternion_from_euler(0, 0, dest["posTh"])
      newDest.orientation.x = quaternion[0]
      newDest.orientation.y = quaternion[1]
      newDest.orientation.z = quaternion[2]
      newDest.orientation.w = quaternion[3]

      msg.destinations += [newDest]
    
    self.publisher.publish(msg)
        

