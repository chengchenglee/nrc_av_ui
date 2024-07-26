#!/usr/bin/env python

# Ros Messages
import rospy
import time
from geometry_msgs.msg import Pose, PoseStamped
from nrc_msgs.msg import MODIARoutePlanDestinations
import tf

# Image display
import os

MULTI_DEST_LIST = [
    {"name": "CCTA Task2 Route", "dests":[
        {"posX": 4002.114, "posY": -27294.275, "posTh": 2.063}, #Bishop Ranch Parking Lot START   
        {"posX": 5816.824, "posY": -32352.945, "posTh": -1.509}, # San Ramon Valley Blvd and Alcosta Blvd
        {"posX": 3970.098, "posY": -28227.105, "posTh": 0.228}, #   I680N off - Bolliger Canyon Rd. 
        {"posX": 4416.771, "posY": -28047.719, "posTh": 0.47},  #  Bollinger Canyon Rd. at Camino Ramon
        {"posX": 4092.156, "posY": -27282.348, "posTh": -1.096}   #  #Bishop Ranch Parking Lot START  
      ]
    },
    {"name": "NATCSV-parking lot loop", "dests":[
        {"posX": 4811.222, "posY": -2273.501, "posTh":  0.042},    
        {"posX": 4852.110, "posY": -2260.700, "posTh":  1.715}, 
        {"posX": 4830.217, "posY": -2236.996, "posTh": -3.128}, 
        {"posX": 4780.050, "posY": -2249.111, "posTh": -1.494},   #4780.092 -2251.246 -1.625
      ]
    },
    {"name": "destination goal test", "dests":[
        {"posX": 4851.722, "posY": -2260.203, "posTh":  1.617},    #4851.722 -2260.203 1.617  
        {"posX": 4899.645, "posY": -2245.225, "posTh": -0.022},   #4899.645 -2245.225 -0.022
      ]
    },
    {
      "name": "NATCSV testing route 1", "dests":[
        {"posX": 4913.783, "posY":  -2245.352, "posTh": -0.050},
        {"posX": 4963.124, "posY":  -2433.774, "posTh": -1.587},
        {"posX": 5322.753, "posY":  -2570.669, "posTh": -0.002},
        {"posX": 5697.440, "posY":  -2564.615, "posTh": 0.047},
        {"posX": 5879.388, "posY":  -2735.727, "posTh": -1.251},
        {"posX": 5655.852, "posY":  -2821.157, "posTh": 3.127},
        {"posX": 5448.475, "posY":  -2671.637, "posTh": 1.433},
        {"posX": 5132.022, "posY":  -2558.263, "posTh": -3.138},
        {"posX": 4971.259, "posY":  -2410.244, "posTh": 1.508},
        {"posX": 4900.645, "posY":  -2236.769, "posTh": -3.083},
        {"posX": 4780.266, "posY":  -2250.462, "posTh": -1.600}
      ]
    }
]

class MultiSetDest:
  def __init__(self, multiDestNameIn, destsIn):
    self.multiDestName = multiDestNameIn
    self.dests = destsIn
    self.advertised = False

  def command(self):
    print("Send destinations: ", self.multiDestName)

    if self.advertised == False:
      self.publisher = rospy.Publisher("/modia/route_plan/destinations", MODIARoutePlanDestinations, queue_size=1)
      self.goal_publisher = rospy.Publisher("/move_base_simple/goal", PoseStamped, queue_size=1)

      self.advertised = True
    
    rospy.sleep(1.0) 
    msg_goal = PoseStamped()

    msg_goal.header.frame_id = "site"
    msg_goal.header.stamp = rospy.Time.now()
    goal_pose = Pose()

    goal_pose.position.x = self.dests[-1]["posX"]
    goal_pose.position.y = self.dests[-1]["posY"]
    quaternion = tf.transformations.quaternion_from_euler(0, 0, self.dests[-1]["posTh"])
    goal_pose.orientation.x = quaternion[0]
    goal_pose.orientation.y = quaternion[1]
    goal_pose.orientation.z = quaternion[2]
    goal_pose.orientation.w = quaternion[3]

    msg_goal.pose = goal_pose

    self.goal_publisher.publish(msg_goal)

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
        

