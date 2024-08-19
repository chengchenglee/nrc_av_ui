#!/usr/bin/env python

import rospy
import argparse
from std_msgs.msg import Empty
from std_msgs.msg import String
from std_msgs.msg import Int32MultiArray
from std_msgs.msg import Int16
from std_msgs.msg import Int16MultiArray
from diagnostic_msgs.msg import *
import numpy as np
from nrc_msgs.msg import CtrlStateFLG
from nrc_msgs.msg import CANVReader
from nrc_msgs.msg import DriverInput
from nrc_msgs.msg import DynamicPoseWithCovar

import time
import subprocess
import os
from collections import deque
import numpy as np

class CsvWriterAVinterface:
    def __init__(self, args):
        self.csvFileName = 'trigger_node_default.csv'
        self.timerInterval = 0.1        # Interval at which the timer callback will run.
        
        self.avEngaged = False
        self.avEngagedTimer = 0
        self.checkEngaged = args.checkEngaged
        self.car = args.car
        #self.updateThisCycle = False

        self.BRK_Override = False
        self.BRK_OverrideTimer = 0
        self.brkTapDuration = 1         # If brake override is less than this time, it is classified as brake tap.

        self.ACC_Override = False
        self.ACC_OverrideTimer = 0
        
        self.snapButton = 0
        self.snapButtonTimer = 0
        
        self.software_EVNT_trigger = False
        self.softwareEventTimer = 0
        self.softwareEventName = ''

        # Snapshot trigger.
        self.writeSnapshot = False
        self.writeTime = 0
        self.prefixList = []
        self.snapshotUpdated = False
        self.filename = ''
        #self.csvDir = os.path.join(os.path.expanduser("~"), 'projects/disengagementData/bags/', time.strftime("%Y-%m-%d"))
        self.csvDir = os.path.join(os.path.expanduser("~"), '/opt/data/snapshots/', time.strftime("%Y-%m-%d"))
        print("csvDir:",self.csvDir)
        dirExists = os.path.isdir(self.csvDir)

        # Pose buffer to keep track of av distance and dynamically update the snapshot past horizon
        self.buffer = deque(maxlen=2000)  # Adjust the size of the buffer as needed
        self.lastPose = None
        self.totalDist = 0
        self.snapshotPastDistanceHorizon = 50 # meters
        self.snapshotPastDistanceHorizonTimeDiff = 0.0 # How much time ago we moved more than snapshotPastDistanceHorizon
        self.snapshotDefaultPastTimeHorizon = 10.0 #seconds
        self.snapshotFutureDistanceHorizon = 20 # meters
        self.snapshotFutureDistanceTraveled = 0.0 # How much distance we traveled since the trigger
        self.snapshotDefaultFutureTimeHorizon = 20.0 # seconds
        self.snapshotMaxFutureTimeHorizon = 45.0 # seconds
        # Record the past horizon at the time of trigger
        self.startedRecordingSnapshot = False
        self.triggerPastHorizon = self.snapshotDefaultPastTimeHorizon

        #Vehicle health publisher
        self.healthPub = rospy.Publisher('/snapshotTrigger/health_status', DiagnosticArray, queue_size=10)
        rospy.init_node('Snapshot_Trigger')
        
        # Create a ROS Timer for reading data
        rospy.Timer(rospy.Duration(self.timerInterval), self.timerCallback)
    
    def poseCallback(self, msg):
        '''
        The idea is to record snapshots whenever there is any trigger or overrides. 
        The code records the data upto 20 seconds after the trigger happens and upto 10 seconds, 
        or the time interval in which the vehicle covered 50 meters, whichever is greater.
        So if the vehicle is moving very fast and it covers 50 meters in 5 seconds, 
        then when a trigger happens the code will record data from 10 seconds prior to the trigger upto 20 seconds after the trigger.
        And if the vehicle is moving very slowly and it covers 50 meters in 15 seconds, 
        then when a trigger happens the code will record data from 15 seconds prior to the trigger upto 20 seconds after the trigger.
        '''
        if self.lastPose is not None:
            # Check the time difference
            if (msg.header.stamp - self.lastPose.header.stamp).to_sec() < 0.1:
                # If the time difference is less than 0.1 second, return without processing the message
                return

            dist = np.sqrt((msg.pose.position.x - self.lastPose.pose.position.x)**2 +
                        (msg.pose.position.y - self.lastPose.pose.position.y)**2)
            self.buffer.append((dist, msg.header.stamp))
            self.totalDist += dist
            # Update the future distance traveled if snapshot started recording
            if self.startedRecordingSnapshot:
                self.snapshotFutureDistanceTraveled += dist

            # Remove elements from the buffer if the distance is more than self.distance_threshold meters
            while self.totalDist > self.snapshotPastDistanceHorizon:
                dist, _ = self.buffer.popleft()
                self.totalDist -= dist

            # Now the time difference is the time of the oldest message in the buffer
            if len(self.buffer) > 0:  # Check if the buffer is not empty
                time_diff = (self.buffer[-1][1] - self.buffer[0][1]).to_sec()
                self.snapshotPastDistanceHorizonTimeDiff = time_diff

        self.lastPose = msg

    def timerCallback(self, data):            # Interval decided by timerInterval.
        if self.avEngaged:
            if (not self.BRK_Override) and (not self.ACC_Override):
              self.avEngagedTimer += self.timerInterval
        
        wasAutonomous = self.avEngagedTimer > 2.0
        
        if wasAutonomous and self.BRK_Override:
            self.writeSnapshot = True
            self.prefixList.append('brkOverride')
            self.BRK_OverrideTimer += self.timerInterval
        
        if wasAutonomous and self.ACC_Override:
            self.writeSnapshot = True
            self.prefixList.append('accOverride')
            self.ACC_OverrideTimer += self.timerInterval
        
        if wasAutonomous and self.snapButton == 2:
            print('Snapshot triggered by button press.')
            self.writeSnapshot = True
            self.prefixList.append('snapButton')
            self.snapButtonTimer += self.timerInterval
            
        if wasAutonomous and self.software_EVNT_trigger:
            self.writeSnapshot = True
            self.prefixList.append(str(self.softwareEventName))
            self.softwareEventTimer += self.timerInterval
        
        #if (not self.avEngaged) and wasAutonomous:
        #    self.writeSnapshot = True
        #    self.prefixList.append('avDisengaged')
        
        # Arranging the name of the prefix for saving files.
        self.prefixList = list(set(self.prefixList))      # This removes any duplicate trigger names in the prefix.
        
        if self.writeSnapshot:
            # If just triggered the snapshot then record past horizon length
            if self.startedRecordingSnapshot == False:
                self.startedRecordingSnapshot = True
                self.triggerPastHorizon = max(self.snapshotPastDistanceHorizonTimeDiff, self.snapshotDefaultPastTimeHorizon)
                self.snapshotStartTime = rospy.Time.now() - rospy.Duration(self.triggerPastHorizon) # Where the snapshot starts from, not the trigger time

            self.writeTime += self.timerInterval
            
        # Create and publish health message
        diagMsg = DiagnosticArray()
        diagMsg.header.stamp = rospy.Time.now()
        diagMsg.status.append(DiagnosticStatus())
        sleepTime = 0.5
        if self.writeSnapshot:
            diagMsg.status[0].level = 5 #pink
        else:
            diagMsg.status[0].level = 3 #green
        self.healthPub.publish(diagMsg)
        
        # Record the future at least snapshotDefaultFutureTimeHorizon seconds, at least snapshotFutureDistanceHorizon meters 
        # upto snapshotMaxFutureTimeHorizon threshold
        futureHorizonReached = ((self.writeTime > self.snapshotDefaultFutureTimeHorizon 
                                and self.snapshotFutureDistanceTraveled > self.snapshotFutureDistanceHorizon)
                                or self.writeTime > self.snapshotMaxFutureTimeHorizon)
        if self.writeSnapshot and futureHorizonReached:
            dirExists = os.path.isdir(self.csvDir)
            if not dirExists:
                os.makedirs(self.csvDir)
                
            prefix = '_'.join(self.prefixList)                  # Used to create the filename to save txt and bag files.
        
            # If a brake override only happens for less than 1 second, then it is called a brake tap.
            # Replacing those 'brkOverride' prefixes with 'brkTap' prefix.
            if 'brkOverride' in prefix and self.BRK_OverrideTimer <= self.brkTapDuration:
                prefix = prefix.replace('brkOverride', 'brkTap' )

            timeStamp = time.strftime('%Y-%m-%d-%H-%M-%S')      # Used to create the filename to save txt and bag files.
            self.filename = '{}_{}'.format(timeStamp,prefix)
            try:
                # Get the current ROS time
                currentTime = rospy.Time.now()
                # print(" Past Horizon of snapshot: ", self.triggerPastHorizon)
                # print(" Future Horizon of snapshot: ", ((currentTime-self.snapshotStartTime) - rospy.Duration(self.triggerPastHorizon)).to_sec())
                # Construct the YAML string for the rosservice call
                yaml_string = """
                                filename: '{}.bag'
                                start_time: {{ secs: {}, nsecs: {} }}
                                stop_time: {{ secs: {}, nsecs: {} }}
                                """.format(self.filename, self.snapshotStartTime.secs, self.snapshotStartTime.nsecs, currentTime.secs, currentTime.nsecs)

                # Properly escape the YAML string for shell execution
                escaped_yaml_string = yaml_string.replace('"', '\\"')

                # Construct the command
                cmd = ("rosservice call /trigger_snapshot \"" + escaped_yaml_string + "\"")

                #cmd = "cd " + self.csvDir + ";rosrun rosbag_snapshot snapshot -t -n -O {}.bag".format(self.filename)
                # cmd = "cd " + self.csvDir + ";rosrun rosbag_snapshot snapshot -t -O {}.bag".format(self.filename)
                self.startedRecordingSnapshot = False
                self.snapshotFutureDistanceTraveled = 0.0
                subprocess.call(cmd, shell=True)
                
                # Now upload to AWS. UPDATE: Moved to a thread instead
                #cmd = "cd " + self.csvDir + ";aws s3 sync . s3://foxtrot-snapshots/snapshot_bagfiles/" + time.strftime("%Y%m%d") +"  --profile foxtrot".format(self.filename) + "&"
                #subprocess.call(cmd, shell=True)

            except:
                print("rosbag_snapshot package not found. Please install to record disengagement/override snapshot bagfiles")
                
            with open(os.path.join(self.csvDir, '{}.txt'.format(self.filename)), 'w') as txtFile:
                txtFile.write('Event happened at: {}'.format(timeStamp))
                
            self.writeSnapshot = False
            self.writeTime = 0
            self.prefixList = []

            # Reset all timers.
            self.avEngagedTimer = 0
            self.BRK_OverrideTimer = 0
            self.ACC_OverrideTimer = 0
            self.snapButtonTimer = 0
            self.softwareEventTimer = 0

            # Reset the self.software_EVNT_trigger after the snapshot is recorded.
            # This has to be done here explicitly as once the trigger is no longer present, the 
            # codes (from other coders) will no longer publish the /software_event_trigger topic.
            # So this code will no longer go into the corresponding callback function.
            # Hence, making the self.software_EVNT_trigger false, will not be executed at all in 
            # the callback function. Hence it has to be done here.
            self.software_EVNT_trigger = False

    def DriverMarkerButtonCallback(self, data):
        '''
        The data in this callback has a value of 8 when the snapbutton is used 
        to trigger recording a snapshot. The snapbutton has multiple usage, so 
        other values will be for other purposes.
        '''
        if len(data.data) > 1:
          self.snapButton = data.data[1]
        
    def CtrlStateFLGcallback(self, data):
        '''
        The data in this callback has some flags (like the following) which 
        becomes some non-zero number when the override happens and then goes back to 
        being zero when the trigger is no longer there.
        '''
        self.BRK_Override = bool(data.BRK_Override)
        self.ACC_Override = bool(data.ACC)
        if self.checkEngaged == True:
          self.avEngaged = bool(data.Engaged)
        else:
          self.avEngaged = True

    def driverInputCallback(self,data):
        '''
        The data in this callback has some flags (like the following) which 
        becomes some non-zero number when the override happens and then goes back to 
        being zero when the trigger is no longer there.
        '''
        if self.car == "Mike":
            self.BRK_Override = bool(data.is_driver_accel)
            self.ACC_Override = bool(data.is_driver_brake)

    def CAN_V_readerCallback(self,data):
        '''
        The data in this callback has some flags (like the following) which 
        becomes some non-zero number when the override happens and then goes back to 
        being zero when the trigger is no longer there.
        '''
        if self.car == "Mike":
            self.avEngaged = bool(data.Switch_MAIN)

    def SoftwareEventTriggerCallback(self, data):
        '''
        This callback will be triggered by the /software_event_trigger topic, which 
        can be generated by several different sources. The details of the reason for 
        this trigger will be present in the string data of this topic which should be 
        included in the name of the corresponding recorded snapshot. 
        The source of the trigger event should publish the string with the data as 
        long as the trigger event is there and then after that the string should be 
        made '' by the code creating the source of the trigger.
        '''
        self.softwareEventName = data.data
        # print(self.softwareEventName)
        if self.softwareEventName != '':
            self.software_EVNT_trigger = True

    def listener(self):
        rospy.Subscriber('/software_event_trigger', String, self.SoftwareEventTriggerCallback)
        rospy.Subscriber('/dynamic_global_pose', DynamicPoseWithCovar, self.poseCallback)
        
        rospy.Subscriber('/CtrlStateFLG', CtrlStateFLG, self.CtrlStateFLGcallback)
        rospy.Subscriber('/ard_state', Int16MultiArray, self.DriverMarkerButtonCallback)
        
        if self.car == "Mike":
            rospy.Subscriber('/CAN_V_reader', CANVReader, self.CAN_V_readerCallback)
            rospy.Subscriber('/driver_input', DriverInput, self.driverInputCallback)

        while not rospy.is_shutdown():
            
            # print(self.avEngaged, self.writeSnapshot, self.BRK_Override, self.ACC_Override)
            #print('\n\n snapbutton value: {} \n\n'.format(self.snapButton))
            
            rospy.sleep(1)  # sleep for one second.
        
if __name__ == '__main__':
    print ('Starting Snapshot Trigger node.')
    
    # Parse arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('-e', '--checkEngaged', default=True)
    parser.add_argument('-c', '--car', default="Foxtrot")
    args, uargs = parser.parse_known_args()
    
    if args.checkEngaged == "False" or args.checkEngaged == "false" or args.checkEngaged == "0":
      print('Not checking if AV is engaged to trigger snapshots.')
      args.checkEngaged = False
    else:
      print('Checking if AV is engaged to trigger snapshots.')
      args.checkEngaged = True
    print("Running snapshot trigger for",args.car)

    clsObj = CsvWriterAVinterface(args)
    clsObj.listener()



