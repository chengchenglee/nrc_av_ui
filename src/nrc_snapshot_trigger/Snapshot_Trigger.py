#!/usr/bin/env python

import rospy
import tf
from std_msgs.msg import Empty
from std_msgs.msg import String
from std_msgs.msg import Int32MultiArray
from std_msgs.msg import Int16
from std_msgs.msg import Int16MultiArray
from diagnostic_msgs.msg import *
from nrc_msgs.msg import CtrlStateFLG
from nrc_msgs.msg import CANVReader
from nrc_msgs.msg import DriverInput
from nrc_msgs.msg import DynamicPoseWithCovar
from nrc_msgs.msg import TrackedObjectSet

import argparse
import time
import subprocess
import os
import json
import numpy as np
from collections import deque

from brk_acc_class import BRK_ACC_CLASS
from soft_evnt_class import SOFT_EVNT_CLASS
from left_right_class import LEFT_RIGHT_CLASS
import write_json



class CsvWriterAVinterface:
    def __init__(self, args):
        
        self.csvFileName = 'trigger_node_default.csv'
        self.timerInterval = 0.1        # Interval at which the timer callback will run.
        
        self.avEngaged = False
        self.prev_avEngaged = False     # Used for creating edge triggers when the flag changes value.
        self.avEngagedTimer = 0
        self.avEngaged_startTimeList = []   # To keep records of when av was engaged.
        self.avEngaged_stopTimeList = []    # To keep records of when av was disengaged.
        self.checkEngaged = args.checkEngaged
        self.car = args.car

        self.brk_acc = BRK_ACC_CLASS()
        self.soft_evnt = SOFT_EVNT_CLASS()
        self.left_right = LEFT_RIGHT_CLASS()

        # Snapshot trigger.
        self.wasAutonomous = False
        self.writeSnapshot = False
        self.writeTime = 0
        self.prefixList = []
        self.durationList = []
        self.startTimeList = []
        self.snapshotUpdated = False
        self.filename = ''
        #self.csvDir = os.path.join(os.path.expanduser("~"), 'projects/disengagementData/bags/', time.strftime("%Y-%m-%d"))
        self.csvDir = os.path.join(os.path.expanduser("~"), '/opt/data/snapshots/', time.strftime("%Y-%m-%d"))
        print("csvDir:",self.csvDir)
        dirExists = os.path.isdir(self.csvDir)
        
        # Pose buffer to keep track of av distance and dynamically update the snapshot past horizon
        self.buff = deque(maxlen=2000)  # Adjust the size of the buffer as needed
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
        self.yaw = 0
        self.currentPose = None
        self.trackedObjList = []

        #Vehicle health publisher
        self.healthPub = rospy.Publisher('/snapshotTrigger/health_status', DiagnosticArray, queue_size=10)
        rospy.init_node('Snapshot_Trigger')
        
        # Places where we don't want to record
        self.exclPoses = []
        self.exclPoses.append([4870.25,-2212.87,0.0194033,75.0,17.0])  #SVPG
        self.inExclusionZone = True
        
        # Create a ROS Timer for reading data
        rospy.Timer(rospy.Duration(self.timerInterval), self.timerCallback)
    



    def updateExclZone(self, msg):
        # Check if we're in an exclusion zone
        self.inExclusionZone = False
        for point in self.exclPoses:
            exclPose = np.zeros((3,3))
            exclPose[0,0] =  np.cos(point[2])
            exclPose[0,1] =  np.sin(point[2])
            exclPose[1,0] = -np.sin(point[2])
            exclPose[1,1] =  np.cos(point[2])
            exclPose[2,2] =  1
            exclPose[0,2] = point[0]
            exclPose[1,2] = point[1]
            exclPoseInv = np.linalg.inv(exclPose)
        
            egoPoint = np.zeros((3,1))
            egoPoint[0,0] = msg.pose.position.x
            egoPoint[1,0] = msg.pose.position.y
            egoPoint[2,0] = 1
        
            relPoint = np.dot(exclPoseInv,egoPoint)
            if abs(relPoint[0,0]) < point[3] and abs(relPoint[1,0]) < point[4]:
                self.inExclusionZone = True
                #print('In exclusion zone',round(relPoint[0,0]*10)/10,round(relPoint[1,0]*10)/10)



    def timerCallback(self, data):            # Interval decided by timerInterval.
        
        if self.avEngaged and self.inExclusionZone == False:
            if (not self.brk_acc.BRK_Override) and (not self.brk_acc.ACC_Override):
                self.avEngagedTimer += self.timerInterval
        else:
            self.avEngagedTimer = 0.0

        if self.avEngaged != self.prev_avEngaged:
            self.prev_avEngaged = self.avEngaged
            
            if self.prev_avEngaged:     # Rising edge.
                self.avEngaged_startTimeList.append(rospy.Time.now())
            else:                       # Falling edge.
                self.avEngaged_stopTimeList.append(rospy.Time.now())

        # When the av is just started and av is engaged, then at that time brake is kept pressed and then reseased.
        # But this is a normal startup procedure to start the av and there is no need to record a brake override at 
        # this instant. That is why the self.wasAutonomous timer is used to prevent this by delaying the recording for 2 sec, 
        # by the end of which this brake override is no longer present.
        self.wasAutonomous = self.avEngagedTimer > 2.0
        
        # timerCallback function is running at 0.1 sec (10 Hz). And other callbacks are running at 0.01 sec (100 Hz).
        # So, sometimes if the duration of the override is too small, then the override appears and then goes away 
        # before the control passes to the timerCallback from the other callbacks. And hence they can be missed out.
        # So, to take care of these overrides, the flags for the overrides if gets high in the respective callbacks, 
        # then their waitForTimerCallback flag is also made high inside their respective callbacks. 
        # But they are not made low when the override goes away. The control passes into the timerCallback where 
        # the respective waitForTimerCallback flags are made low, and only after that the override flags are allowed 
        # to go false. So, the waitForTimerCallback flags are set in the respective callback functions and reset in 
        # the timerCallback function. This forces the override flags to stay high till the control reaches back to 
        # the timerCallback function so that they can get recorded in the snapshots.
        
        self.brk_acc.BRK_Override_waitForTimerCallback = False
        self.brk_acc.ACC_Override_waitForTimerCallback = False
        #self.brk_acc.snapButtonTrig_waitForTimerCallback = False
        self.soft_evnt.softwareEventTrig_waitForTimerCallback = False
        
       
        self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList = self.brk_acc.process_BRK_Override(self.wasAutonomous, self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList)
        self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList = self.brk_acc.process_ACC_Override(self.wasAutonomous, self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList)
        #self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList = self.brk_acc.process_snapButtonTrig(self.wasAutonomous, self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList)
        
        self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList = self.soft_evnt.process_softwareEventTrig(self.wasAutonomous, self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList)
        
        # Turns and lane changes are included in the snapshots only if there are some desired tracked objects 
        # present near the AV during the beginning of the turn or lane change.
        self.left_right.updateTurnSignalTrigR(self.timerInterval, self.yaw)
        self.left_right.updateTurnSignalTrigL(self.timerInterval, self.yaw)
        self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList = self.left_right.process_turnSignalTrigR(self.wasAutonomous, self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList, \
                                                                                                                             self.currentPose, self.trackedObjList)
        self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList = self.left_right.process_turnSignalTrigL(self.wasAutonomous, self.writeSnapshot, self.prefixList, self.durationList, self.startTimeList, \
                                                                                                                             self.currentPose, self.trackedObjList)
        

        #print(self.prefixList)
        
        
        # Calculating the start time for this snapshot.
        if self.writeSnapshot:
            # If just triggered the snapshot then record past horizon length
            if self.startedRecordingSnapshot == False:
                self.startedRecordingSnapshot = True
                self.triggerPastHorizon = max(self.snapshotPastDistanceHorizonTimeDiff, self.snapshotDefaultPastTimeHorizon)
                self.snapshotStartTime = rospy.Time.now() - rospy.Duration(self.triggerPastHorizon) # Where the snapshot starts from, not the trigger time
                
            self.writeTime += self.timerInterval

            # Checking if there is any existing trigger still active. 
            # If no trigger is active, then start calculating the writeTime and snapshotFutureDistanceTraveled, and when they reach their desired 
            # threshold, i.e. the future horizon is reached, and then write the snapshot.
            # If there is any trigger then becomes active suddenly while the writeTime and snapshotFutureDistanceTraveled are still getting calculated, and 
            # the future horizon is not yet reached, then reset them to 0 and then restart calculating them, after all the triggers are inactive again.
            # This way the writeTime and future horizon will get extended beyond the last trigger that happened.
            # Basically, if any trigger happens within the future horizon, then the future horizon is reinitialized and then recalculated when there is 
            # no active trigger anymore.
            anyTriggersStillActive = bool(self.brk_acc.BRK_Override or self.brk_acc.ACC_Override or self.soft_evnt.softwareEventTrig or self.left_right.turnSignalActiveR or
                                          self.left_right.turnSignalActiveL)

            if anyTriggersStillActive:
                self.writeTime = 0
                self.snapshotFutureDistanceTraveled = 0.0
            
            
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
        #if self.writeSnapshot and futureHorizonReached:
            dirExists = os.path.isdir(self.csvDir)
            if not dirExists:
                os.makedirs(self.csvDir)
            
        
            timeStamp = time.strftime('%Y-%m-%d-%H-%M-%S')      # Used to create the filename to save txt and bag files.
            #prefix = '_'.join(self.prefixList)
            #self.filename = '{}_{}'.format(timeStamp, prefix)
            self.filename = '{}_snapshot'.format(timeStamp)

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
                #cmd = ("rosservice call /trigger_snapshot \"" + escaped_yaml_string + "\"")
                cmd = ("rosservice call /trigger_snapshot \"" + escaped_yaml_string + "\"" + " &")

                #cmd = "cd " + self.csvDir + ";rosrun rosbag_snapshot snapshot -t -n -O {}.bag".format(self.filename)
                # cmd = "cd " + self.csvDir + ";rosrun rosbag_snapshot snapshot -t -O {}.bag".format(self.filename)
                self.startedRecordingSnapshot = False
                self.snapshotFutureDistanceTraveled = 0.0
                subprocess.call(cmd, shell=True)
                
            except:
                print("rosbag_snapshot package not found. Please install to record disengagement/override snapshot bagfiles")
                
            write_json.create_json_file(self.csvDir, self.filename, self.snapshotStartTime, self.avEngaged_startTimeList, self.avEngaged_stopTimeList, \
                                        self.prefixList, self.durationList, self.startTimeList)

            self.writeSnapshot = False
            self.writeTime = 0
            self.prefixList = []
            self.startTimeList = []
            self.durationList = []
            self.avEngaged_startTimeList = []
            self.avEngaged_stopTimeList = []


            # Reset the self.soft_evnt.softwareEventTrig after the snapshot is recorded.
            # This has to be done here explicitly as once the trigger is no longer present, the 
            # codes (from other coders) will no longer publish the /software_event_trigger topic.
            # So this code will no longer go into the corresponding callback function.
            # Hence, making the self.soft_evnt.softwareEventTrig false, will not be executed at all in 
            # the callback function. Hence it has to be done here.
            self.soft_evnt.softwareEventTrig = False
                


        
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
        # Disable recording snapshots in some locations, like SVPG
        self.updateExclZone(msg)
        
        self.currentPose = msg          # Used to calculate the distance of AV from nearby objects.
        
        if self.lastPose is not None:
            # Check the time difference
            if (msg.header.stamp - self.lastPose.header.stamp).to_sec() < 0.1:
                # If the time difference is less than 0.1 second, return without processing the message
                return

            dist = np.sqrt((msg.pose.position.x - self.lastPose.pose.position.x)**2 +
                        (msg.pose.position.y - self.lastPose.pose.position.y)**2)
            self.buff.append((dist, msg.header.stamp))
            self.totalDist += dist
            # Update the future distance traveled if snapshot started recording
            if self.startedRecordingSnapshot:
                self.snapshotFutureDistanceTraveled += dist

            # Remove elements from the buffer if the distance is more than self.distance_threshold meters
            while self.totalDist > self.snapshotPastDistanceHorizon:
                dist, _ = self.buff.popleft()
                self.totalDist -= dist

            # Now the time difference is the time of the oldest message in the buffer
            if len(self.buff) > 0:  # Check if the buffer is not empty
                time_diff = (self.buff[-1][1] - self.buff[0][1]).to_sec()
                self.snapshotPastDistanceHorizonTimeDiff = time_diff
                
            # The yaw is used for turn and lane change detection.
            quaternion = (msg.pose.orientation.x, msg.pose.orientation.y, msg.pose.orientation.z, msg.pose.orientation.w)
            euler = tf.transformations.euler_from_quaternion(quaternion)
            self.yaw = euler[2]

        self.lastPose = msg


    #def DriverMarkerButtonCallback(self, data):
        #'''
        #The data in this callback has a value of 2 when the snapbutton is used 
        #to trigger recording a snapshot. The snapbutton has multiple usage, so 
        #other values will be for other purposes.
        #'''
        #if len(data.data) > 1:
            #if data.data[1] == 2:
                #self.brk_acc.snapButtonTrig = True
                #self.brk_acc.snapButtonTrig_waitForTimerCallback = True
            #else:
                #if not self.brk_acc.snapButtonTrig_waitForTimerCallback:
                    #self.brk_acc.snapButtonTrig = False
                    
        
    def CtrlStateFLGcallback(self, data):
        '''
        The data in this callback has some flags (like the following) which 
        becomes some non-zero number when the override happens and then goes back to 
        being zero when the trigger is no longer there.
        '''
        if bool(data.BRK_Override):
            self.brk_acc.BRK_Override = True
            self.brk_acc.BRK_Override_waitForTimerCallback = True
        else:
            if not self.brk_acc.BRK_Override_waitForTimerCallback:
                self.brk_acc.BRK_Override = False

        #self.brk_acc.BRK_Override = bool(data.BRK_Override)

        if bool(data.ACC):
            self.brk_acc.ACC_Override = True
            self.brk_acc.ACC_Override_waitForTimerCallback = True
        else:
            if not self.brk_acc.ACC_Override_waitForTimerCallback:
                self.brk_acc.ACC_Override = False

        #self.brk_acc.ACC_Override = bool(data.ACC)

        if self.checkEngaged == True:
            self.avEngaged = bool(data.Engaged)
        else:
            self.avEngaged = True
            

    def driverInputCallback(self, data):
        '''
        The data in this callback has some flags (like the following) which 
        becomes some non-zero number when the override happens and then goes back to 
        being zero when the trigger is no longer there.
        '''
        #if self.car == "Mike":
            #self.brk_acc.BRK_Override = bool(data.is_driver_accel)
            #self.brk_acc.ACC_Override = bool(data.is_driver_brake)

        if self.car == "Mike":
            if bool(data.is_driver_accel):
                self.brk_acc.BRK_Override = True
                self.brk_acc.BRK_Override_waitForTimerCallback = True
            else:
                if not self.brk_acc.BRK_Override_waitForTimerCallback:
                    self.brk_acc.BRK_Override = False

            if bool(data.is_driver_brake):
                self.brk_acc.ACC_Override = True
                self.brk_acc.ACC_Override_waitForTimerCallback = True
            else:
                if not self.brk_acc.ACC_Override_waitForTimerCallback:
                    self.brk_acc.ACC_Override = False


    def CAN_V_readerCallback(self, data):
        '''
        The data in this callback has some flags (like the following) which 
        becomes some non-zero number when the override happens and then goes back to 
        being zero when the trigger is no longer there.
        '''
        val = int(data.TurnSignals)     # Default: 0, Left: 1, Right: 2.
        
        # Separate turn signal indicators are created for the left and right turns.
        if val == 0:
            self.left_right.turnSignalValR = False
            self.left_right.turnSignalValL = False
        elif val == 1:
            self.left_right.turnSignalValR = False
            self.left_right.turnSignalValL = True
        elif val == 2:
            self.left_right.turnSignalValR = True
            self.left_right.turnSignalValL = False

        if self.car == "Mike":
            self.avEngaged = bool(data.Switch_MAIN)


    def trackedObjCallback(self, msg):
        '''
        This callback gives a list of tracked objects around the AV.
        '''
        self.trackedObjList = msg.objects
        
        

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
        self.soft_evnt.softwareEventTrigName = data.data
        # print(self.soft_evnt.softwareEventTrigName)
        if self.soft_evnt.softwareEventTrigName != '':
            self.soft_evnt.softwareEventTrig = True
            self.soft_evnt.softwareEventTrig_waitForTimerCallback = True
        else:
            if not self.soft_evnt.softwareEventTrig_waitForTimerCallback:
                self.soft_evnt.softwareEventTrig = False
            


    def listener(self):
        rospy.Subscriber('/software_event_trigger', String, self.SoftwareEventTriggerCallback)
        rospy.Subscriber('/dynamic_global_pose', DynamicPoseWithCovar, self.poseCallback)
        rospy.Subscriber('/ailsv_tracked_objects', TrackedObjectSet, self.trackedObjCallback)
        rospy.Subscriber('/CtrlStateFLG', CtrlStateFLG, self.CtrlStateFLGcallback)
        #rospy.Subscriber('/ard_state', Int16MultiArray, self.DriverMarkerButtonCallback)

        rospy.Subscriber('/CAN_V_reader', CANVReader, self.CAN_V_readerCallback)
        
        if self.car == "Mike":
            rospy.Subscriber('/driver_input', DriverInput, self.driverInputCallback)

        while not rospy.is_shutdown():
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
    print("Running snapshot trigger for", args.car)

    clsObj = CsvWriterAVinterface(args)
    clsObj.listener()



