#!/usr/bin/env python

import rospy
from std_msgs.msg import Empty
from std_msgs.msg import String
from std_msgs.msg import Int32MultiArray
import numpy as np
from nrc_msgs.msg import CtrlStateFLG
#from nrc_msgs.msg import SnapShotTrigger
import time
import subprocess
import os


#from RosMsgMonitorForAVinterface import *

class CsvWriterAVinterface:
    def __init__(self):
        self.csvFileName = 'trigger_node_default.csv'
        self.timerInterval = 0.1        # Interval at which the timer callback will run.
        
        self.avEngaged = False
        self.avEngagedTimer = 0
        self.updateThisCycle = False

        self.BRK_Override = False
        self.BRK_OverrideTimer = 0

        self.ACC_Override = False
        self.ACC_OverrideTime = 0
        
        self.bicycleDetect = False

        # Snapshot trigger.
        self.writeSnapshot = False
        self.writeTime = 0
        self.writeTimeDuration = 10
        self.prefixList = []
        self.snapshotUpdated = False
        self.filename = ''
        self.csvDir = ''

        self.pub = rospy.Publisher('chatter', String, queue_size=10)
        
        rospy.init_node('trigger_node', anonymous=True)
        
        # Create a ROS Timer for reading data
        rospy.Timer(rospy.Duration(self.timerInterval), self.timerCallback)
    
        
        #self.timer = 

    #brkOverride
    #brkOverrideTimer += 0.1
    #acc
    #engaged
    
    def timerCallback(self, data):            # Interval decided by timerInterval.
        #print(time.time
        #print("Timer callback")
        if self.avEngaged:
            self.updateThisCycle = True
            self.avEngagedTimer += self.timerInterval
        
        if (not self.avEngaged) and self.updateThisCycle:
            self.writeSnapshot = True
            self.prefixList.append('avDisengaged')
            self.avEngagedTimer = 0
        
        if self.avEngaged and self.BRK_Override:
            self.writeSnapshot = True
            self.prefixList.append('brkOverride')
            self.BRK_OverrideTimer += self.timerInterval
        else:
            self.BRK_OverrideTimer = 0
        
        if self.avEngaged and self.ACC_Override:
            self.writeSnapshot = True
            self.prefixList.append('accOverride')
            self.ACC_OverrideTimer += self.timerInterval
        else:
            self.ACC_OverrideTimer = 0
        
        if self.avEngaged and self.bicycleDetect:
            self.writeSnapshot = True
            self.prefixList.append('bicycleDetect')
            self.bicycleDetectTimer += self.timerInterval
        else:
            self.bicycleDetectTimer = 0
            
        # Arranging the name of the prefix for saving files.
        self.prefixList.sort()
        self.prefixList = list(set(self.prefixList))      # This removes any duplicate trigger names in the prefix.
        
        #Run snapshot trigger and record from the buffer
        
        
        if self.writeSnapshot:
            self.writeTime += self.timerInterval
            
          
        if self.writeSnapshot and self.writeTime > self.writeTimeDuration:
            #print("Line 102")
            self.csvDir = os.path.join(os.path.expanduser("~"), 'projects/disengagementData/', time.strftime("%Y%m%d"),'bags')
            dirExists = os.path.isdir(self.csvDir)
            if not dirExists:
                os.makedirs(self.csvDir)
            prefix = '_'.join(self.prefixList)                  # Used to create the filename to save txt and bag files.
            timeStamp = time.strftime('%Y-%m-%d-%H-%M-%S')      # Used to create the filename to save txt and bag files.
            self.filename = '{}_{}'.format(prefix, timeStamp)
            try:
                #print("Line 111")
                #cmd = "cd " + self.csvDir + ";rosrun rosbag_snapshot snapshot -t -n -O {}.bag".format(self.filename)
                cmd = "cd " + self.csvDir + ";rosrun rosbag_snapshot snapshot -t -O {}.bag".format(self.filename)
                subprocess.call(cmd, shell=True)
                #print("Reached after subprocess for snapshot trigger")
                
                # Now upload to AWS.
                cmd = "cd " + self.csvDir + ";aws s3 sync . s3://rosbag-upload-test/snapshot_bagfiles/" + time.strftime("%Y%m%d") +"  --profile sachin".format(self.filename)
                subprocess.call(cmd, shell=True)
                
            except:
                print("rosbag_snapshot package not found. Please install to record disengagement/override snapshot bagfiles")
                
            with open(os.path.join(self.csvDir, '{}.txt'.format(self.filename)), 'w') as txtFile:
                txtFile.write('Event happened at: {}'.format(timeStamp))
                #print("Created txt file")
                
            self.writeSnapshot = False
            self.writeTime = 0
            self.updateThisCycle = False
            self.prefixList = []
    
            #Create a txt file for why snapshot was Running
            # When the event happened. Include the name of the event as a prefix into the text and bag file names.
            # State of the vehicle like x, y, z, speed
            # 
        
        #if os.path.exists(os.path.join(self.csvDir, self.filename + '.bag')) and (not os.path.exists(os.path.join(self.csvDir, self.filename + '.bag.active'))):
            #self.snapshotUpdated = True
            #print('Snapshot file write complete.')
            #self.filename = ''
        #else:
            #self.snapshotUpdated = False
      
        #Check if snapshot is still running and if there is a new trigger
          
    def callback(self, data):
        pass
        #print ('message received')
        

    def dummyCallback(self,data):
        #print('inside CtrlStateFLGcallback')
        self.BRK_Override = bool(data.data[0])
        self.ACC_Override = bool(data.data[1])
        self.avEngaged = bool(data.data[2])


    def CtrlStateFLGcallback(self, data):
        #print('inside CtrlStateFLGcallback')
        self.BRK_Override = bool(data.BRK_Override)
        self.ACC_Override = bool(data.ACC_Override)
        self.avEngaged = bool(data.Engaged)

    #def SnapshotTriggercallback(self, data):
        #Bicycle
    

    def listener(self):

        rospy.Subscriber('chatter', String, self.callback)
        
        #rospy.Subscriber('/CtrlStateFLG', CtrlStateFLG, self.CtrlStateFLGcallback)
        rospy.Subscriber('/CtrlStateFLGDummy', Int32MultiArray, self.dummyCallback)

        while not rospy.is_shutdown():
            publishStr = 'Hello..... Time is: {}'.format(time.time())
            
            self.pub.publish(publishStr)
            #print(self.avEngaged, self.updateThisCycle, self.writeSnapshot, self.BRK_Override, self.ACC_Override)
            
            rospy.sleep(1)  # sleep for one second.
        
if __name__ == '__main__':
    print ('Running')
    
    clsObj = CsvWriterAVinterface()

    clsObj.listener()



