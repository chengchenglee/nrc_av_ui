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
    parser.add_argument('-t', '--pub_topic_name', default='RosbagHealth')
    parser.add_argument('-n', '--name', default='RosbagRecordMonitor')
    parser.add_argument('-m', '--mode', default='Always')
    args, uargs = parser.parse_known_args()
    
    # Get path to where bags will be recorded
    todaysDate = ''.join(time.strftime("%Y-%m-%d"))
    pathToBags = args.directory+todaysDate+"/"
    print("Rosbag monitor pointing at:",pathToBags)

    # Init ros stuff
    rospy.init_node(args.name)
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
      if args.mode == 'Trigger':
        sleepTime = 0.1
        if currentMaxFileSize > prevMaxFilesize:
          print(currentMaxFileSize)
          diagMsg.status[0].level = 5
          sleepTime = 0.1
        else:
          diagMsg.status[0].level = 2
      else:
        sleepTime = 0.5
        if currentMaxFileSize > prevMaxFilesize:
          print(currentMaxFileSize)
          diagMsg.status[0].level = 3
          sleepTime = 0.1
        elif currentMaxFileSize > 0:
          diagMsg.status[0].level = 2

      healthPub.publish(diagMsg)
      
      prevMaxFilesize = currentMaxFileSize
      time.sleep(sleepTime)

    print("Closing rosbag monitor")
    
