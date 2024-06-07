#!/usr/bin/python

import os
import rospy
import argparse
import time
import glob
from diagnostic_msgs.msg import *

if __name__ == '__main__':
    # Parse arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('-d', '--directory', default='/opt/data/rosbag/')
    parser.add_argument('-t', '--pub_topic_name', default='rosbagRecordMonitor')
    args = parser.parse_args()
    
    # Get path to where bags will be recorded
    todaysDate = ''.join(time.strftime("%Y-%m-%d"))
    pathToBags = args.directory+todaysDate+"/"
    print("Rosbag monitor pointing at:",pathToBags)

    # Init ros stuff
    rospy.init_node('RosbagRecordMonitorNode')
    healthPub = rospy.Publisher(args.pub_topic_name,DiagnosticArray,queue_size=1)

    print ('Running')
    prevMaxFilesize = 0
    while not rospy.is_shutdown():
      # Check for active files that are growing in size
      activeFiles = glob.glob(pathToBags+"*.active")
      currentMaxFileSize = 0
      for filename in activeFiles:
        currentMaxFileSize = max(currentMaxFileSize, os.path.getsize(filename))

      # Create and publish health message
      diagMsg = DiagnosticArray()
      diagMsg.header.stamp = rospy.Time.now()
      diagMsg.status.append(DiagnosticStatus())
      if currentMaxFileSize > prevMaxFilesize:
        diagMsg.status[0].level = 2
      elif currentMaxFileSize > 0:
        diagMsg.status[0].level = 1
      healthPub.publish(diagMsg)
      
      prevMaxFilesize = currentMaxFileSize
      time.sleep(0.1)

    print("Closing rosbag monitor")
    
