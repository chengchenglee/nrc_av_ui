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
import json

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

        self.BRK_Override = False
        self.prev_BRK_Override = False      # Used for creating edge triggers when the flag changes value.
        self.BRK_Override_waitForTimerCallback = False
        self.BRK_Override_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        #self.BRK_Override_wasAutonomousAtFallingEdge = False    # Flag to check if AV was engaged or was autonomous at falling edge of trigger.
        self.BRK_OverrideTimer = 0
        self.BRK_Override_startTime = 0
        self.brkTapDuration = 1         # If brake override is less than this time, it is classified as brake tap.

        self.ACC_Override = False
        self.prev_ACC_Override = False      # Used for creating edge triggers when the flag changes value.
        self.ACC_Override_waitForTimerCallback = False
        self.ACC_Override_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        #self.ACC_Override_wasAutonomousAtFallingEdge = False    # Flag to check if AV was engaged or was autonomous at falling edge of trigger.
        self.ACC_OverrideTimer = 0
        self.ACC_Override_startTime = 0
        
        self.snapButtonTrig = False
        self.prev_snapButtonTrig = False    # Used for creating edge triggers when the flag changes value.
        self.snapButtonTrig_waitForTimerCallback = False
        self.snapButtonTrig_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        #self.snapButtonTrig_wasAutonomousAtFallingEdge = False    # Flag to check if AV was engaged or was autonomous at falling edge of trigger.
        self.snapButtonTrigTimer = 0
        self.snapButtonTrig_startTime = 0
        
        self.softwareEventTrig = False
        self.prev_softwareEventTrig = False     # Used for creating edge triggers when the flag changes value.
        self.softwareEventTrig_waitForTimerCallback = False
        self.softwareEventTrig_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        #self.softwareEventTrig_wasAutonomousAtFallingEdge = False    # Flag to check if AV was engaged or was autonomous at falling edge of trigger.
        self.softwareEventTrigTimer = 0
        self.softwareEventTrig_startTime = 0
        self.softwareEventTrigName = ''

        # Snapshot trigger.
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


        self.nACC_Override = 0
        self.nBRK_Override = 0

        #Vehicle health publisher
        self.healthPub = rospy.Publisher('/snapshotTrigger/health_status', DiagnosticArray, queue_size=10)
        rospy.init_node('Snapshot_Trigger')
        
        # Places where we don't want to record
        self.exclPoses = []
        self.exclPoses.append([4870.25,-2212.87,0.0194033,75.0,17.0])  #SVPG
        self.inExclusionZone = True
        
        # Create a ROS Timer for reading data
        rospy.Timer(rospy.Duration(self.timerInterval), self.timerCallback)
    
    def updateExclZone(self,msg):
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
        
        if self.avEngaged and self.inExclusionZone = False:
            if (not self.BRK_Override) and (not self.ACC_Override):
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
        # this instant. That is why the wasAutonomous timer is used to prevent this by delaying the recording for 2 sec, 
        # by the end of which this brake override is no longer present.
        wasAutonomous = self.avEngagedTimer > 2.0
        
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
        self.BRK_Override_waitForTimerCallback = False
        self.ACC_Override_waitForTimerCallback = False
        self.snapButtonTrig_waitForTimerCallback = False
        self.softwareEventTrig_waitForTimerCallback = False
        
        # Only enter these 'if' statements a rising or a falling edge of the trigger is detected.
        # Previous and current value of the trigger flag is false by start.
        # When the trigger is true, current and previous values become different and these 'if' are executed.
        # Once inside, the previous value is updated with the current value. Hence, this 'if' will not 
        # executed again. 
        # Then when the trigger is no longer there, the current value of the trigger is false, so the 
        # previous and current values are again different and this 'if' is executed again.
        # Then previous value is again made the same as current value (which is false now). So, both the 
        # previous and current values of the trigger is again the same and again the 'if' will not be executed. 
        # Until another trigger arrives.
        # Rising edge of the trigger has current value as true and previous value as false.
        # Falling edge of the trigger has current value as false and previous value as true.

        #print('BK_O', self.BRK_Override, 'p_BK_O', self.prev_BRK_Override, 'AC_O', self.ACC_Override, 'p_AC_O', self.prev_ACC_Override, 'avEngaged', self.avEngaged, 'avEngagedTimer', self.avEngagedTimer)
        #print('wasAutonomous', wasAutonomous, 'avEngaged', self.avEngaged, 'avEngagedTimer', self.avEngagedTimer)


        #if wasAutonomous and (self.BRK_Override != self.prev_BRK_Override):
        if self.BRK_Override != self.prev_BRK_Override:
            #self.writeSnapshot = True
            self.prev_BRK_Override = self.BRK_Override
            
            if self.prev_BRK_Override:      # Rising edge.
                self.BRK_Override_startTime = rospy.Time.now()
                self.BRK_Override_wasAutonomousAtRisingEdge = wasAutonomous
                self.writeSnapshot = wasAutonomous              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
            else:                           # Falling edge.
                self.BRK_OverrideTimer = (rospy.Time.now() - self.BRK_Override_startTime).to_sec()
                #self.BRK_Override_wasAutonomousAtFallingEdge = wasAutonomous
                
                # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                # still record a even if the av was disengaged before the falling edge of the trigger. 
                # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                #if self.BRK_Override_wasAutonomousAtRisingEdge or self.BRK_Override_wasAutonomousAtFallingEdge:
                if self.BRK_Override_wasAutonomousAtRisingEdge:
                    if self.BRK_OverrideTimer <= self.brkTapDuration:
                        self.prefixList.append('brkTap')
                        self.durationList.append(self.BRK_OverrideTimer)
                        self.startTimeList.append(self.BRK_Override_startTime)
                        #print('brkTap')
                    else:            # If a brake override only happens for less than 1 second, then it is called a brake tap.
                        self.prefixList.append('brkOverride')
                        self.durationList.append(self.BRK_OverrideTimer)
                        self.startTimeList.append(self.BRK_Override_startTime)
                        #print('brkOverride')

                self.BRK_Override_startTime = 0         # Reinitialize.
                self.BRK_OverrideTimer = 0
                self.BRK_Override_wasAutonomousAtRisingEdge = False
                #self.BRK_Override_wasAutonomousAtFallingEdge = False
        
        #if wasAutonomous and (self.ACC_Override != self.prev_ACC_Override):
        if self.ACC_Override != self.prev_ACC_Override:
            #self.writeSnapshot = True
            self.prev_ACC_Override = self.ACC_Override

            if self.prev_ACC_Override:      # Rising edge.
                self.ACC_Override_startTime = rospy.Time.now()
                self.ACC_Override_wasAutonomousAtRisingEdge = wasAutonomous
                self.writeSnapshot = wasAutonomous              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
            else:                           # Falling edge.
                self.ACC_OverrideTimer = (rospy.Time.now() - self.ACC_Override_startTime).to_sec()
                #self.ACC_Override_wasAutonomousAtFallingEdge = wasAutonomous

                # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                # still record a even if the av was disengaged before the falling edge of the trigger. 
                # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                #if self.ACC_Override_wasAutonomousAtRisingEdge or self.ACC_Override_wasAutonomousAtFallingEdge:
                if self.ACC_Override_wasAutonomousAtRisingEdge:
                    self.prefixList.append('accOverride')
                    self.durationList.append(self.ACC_OverrideTimer)
                    self.startTimeList.append(self.ACC_Override_startTime)
                    #print('accOverride')

                self.ACC_Override_startTime = 0         # Reinitialize.
                self.ACC_OverrideTimer = 0
                self.ACC_Override_wasAutonomousAtRisingEdge = False
                #self.ACC_Override_wasAutonomousAtFallingEdge = False
        
        #if wasAutonomous and (self.snapButtonTrig != self.prev_snapButtonTrig):
        if self.snapButtonTrig != self.prev_snapButtonTrig:
            print('Snapshot triggered by button press.')
            #self.writeSnapshot = True
            self.prev_snapButtonTrig = self.snapButtonTrig
            
            if self.prev_snapButtonTrig:    # Rising edge.
                self.snapButtonTrig_startTime = rospy.Time.now()
                self.snapButtonTrig_wasAutonomousAtRisingEdge = wasAutonomous
                self.writeSnapshot = wasAutonomous              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
            else:                           # Falling edge.
                self.snapButtonTrigTimer = (rospy.Time.now() - self.snapButtonTrig_startTime).to_sec()
                #self.snapButtonTrig_wasAutonomousAtFallingEdge = wasAutonomous
                
                # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                # still record a even if the av was disengaged before the falling edge of the trigger. 
                # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                #if self.snapButtonTrig_wasAutonomousAtRisingEdge or self.snapButtonTrig_wasAutonomousAtFallingEdge:
                if self.snapButtonTrig_wasAutonomousAtRisingEdge:
                    self.prefixList.append('snapButton')
                    self.durationList.append(self.snapButtonTrigTimer)
                    self.startTimeList.append(self.snapButtonTrig_startTime)

                self.snapButtonTrig_startTime = 0           # Reinitialize.
                self.snapButtonTrigTimer = 0
                self.snapButtonTrig_wasAutonomousAtRisingEdge = False
                #self.snapButtonTrig_wasAutonomousAtFallingEdge = False
            
        #if wasAutonomous and (self.softwareEventTrig != self.prev_softwareEventTrig):
        if self.softwareEventTrig != self.prev_softwareEventTrig:
            #self.writeSnapshot = True
            self.prev_softwareEventTrig = self.softwareEventTrig

            if self.prev_softwareEventTrig:  # Rising edge.
                self.softwareEventTrig_startTime = rospy.Time.now()
                self.softwareEventTrig_wasAutonomousAtRisingEdge = wasAutonomous
                self.writeSnapshot = wasAutonomous              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
            else:                           # Falling edge.
                self.softwareEventTrigTimer = (rospy.Time.now() - self.softwareEventTrig_startTime).to_sec()
                #self.softwareEventTrig_wasAutonomousAtFallingEdge = wasAutonomous

                # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                # still record a even if the av was disengaged before the falling edge of the trigger. 
                # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                #if self.softwareEventTrig_wasAutonomousAtRisingEdge or self.softwareEventTrig_wasAutonomousAtFallingEdge:
                if self.softwareEventTrig_wasAutonomousAtRisingEdge:
                    self.prefixList.append(str(self.softwareEventTrigName))
                    self.durationList.append(self.softwareEventTrigTimer)
                    self.startTimeList.append(self.softwareEventTrig_startTime)

                self.softwareEventTrig_startTime = 0        # Reinitialize.
                self.softwareEventTrigTimer = 0
                self.softwareEventTrig_wasAutonomousAtRisingEdge = False
                #self.softwareEventTrig_wasAutonomousAtFallingEdge = False
        
        
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
            anyTriggersStillActive = bool(self.BRK_Override or self.ACC_Override or self.snapButtonTrig or self.softwareEventTrig)

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
                
            with open(os.path.join(self.csvDir, '{}.json'.format(self.filename)), 'w') as infoFile:
                infoDict = {'snapshotStartTime': '{} secs {} nsecs'.format(self.snapshotStartTime.secs, self.snapshotStartTime.nsecs),
                            'totalEventCount': len(self.prefixList)}

                for avEnSt in self.avEngaged_startTimeList:
                    timeSinceSnapshotStartTime = (avEnSt - self.snapshotStartTime).to_sec()
                    if timeSinceSnapshotStartTime > 0:      # av was engaged while snapshot was in progress. Only then record this entry in the snapshot file.
                        eventName = 'avEngaged'
                        if eventName not in infoDict:       # Durations are not recorded for avEngaged or avDisengaged events, because those may extend beyond the snapshot duration.
                            infoDict[eventName] = {'count': 1, 'startTime': [(avEnSt).to_sec()], 'timeSinceSnapshotStartTime': [timeSinceSnapshotStartTime], 'duration': []}
                        else:
                            infoDict[eventName]['count'] += 1
                            infoDict[eventName]['startTime'].append((avEnSt).to_sec())
                            infoDict[eventName]['timeSinceSnapshotStartTime'].append(timeSinceSnapshotStartTime)
                            infoDict[eventName]['duration'].append([])
                        
                for avEnSt in self.avEngaged_stopTimeList:
                    timeSinceSnapshotStartTime = (avEnSt - self.snapshotStartTime).to_sec()
                    if timeSinceSnapshotStartTime > 0:      # av was disengaged while snapshot was in progress. Only then record this entry in the snapshot file.
                        eventName = 'avDisengaged'
                        if eventName not in infoDict:       # Durations are not recorded for avEngaged or avDisengaged events, because those may extend beyond the snapshot duration.
                            infoDict[eventName] = {'count': 1, 'startTime': [(avEnSt).to_sec()], 'timeSinceSnapshotStartTime': [timeSinceSnapshotStartTime], 'duration': []}
                        else:
                            infoDict[eventName]['count'] += 1
                            infoDict[eventName]['startTime'].append((avEnSt).to_sec())
                            infoDict[eventName]['timeSinceSnapshotStartTime'].append(timeSinceSnapshotStartTime)
                            infoDict[eventName]['duration'].append([])

                for cc in range(len(self.prefixList)):
                    eventName = self.prefixList[cc]
                    eventDuration = self.durationList[cc]
                    eventStartTime = self.startTimeList[cc]
                    timeSinceSnapshotStartTime = (eventStartTime - self.snapshotStartTime).to_sec()
                    
                    if eventName not in infoDict:
                        infoDict[eventName] = {'count': 1, 'startTime': [(eventStartTime).to_sec()], 'timeSinceSnapshotStartTime': [timeSinceSnapshotStartTime], 'duration': [eventDuration]}
                    else:
                        infoDict[eventName]['count'] += 1
                        infoDict[eventName]['startTime'].append((eventStartTime).to_sec())
                        infoDict[eventName]['timeSinceSnapshotStartTime'].append(timeSinceSnapshotStartTime)
                        infoDict[eventName]['duration'].append(eventDuration)

                json.dump(infoDict, infoFile, indent=4, separators=(',', ': '))
                
            self.writeSnapshot = False
            self.writeTime = 0
            self.prefixList = []
            self.startTimeList = []
            self.durationList = []
            self.avEngaged_startTimeList = []
            self.avEngaged_stopTimeList = []

            ## Reset all timers.
            #self.avEngagedTimer = 0

            # Reset the self.softwareEventTrig after the snapshot is recorded.
            # This has to be done here explicitly as once the trigger is no longer present, the 
            # codes (from other coders) will no longer publish the /software_event_trigger topic.
            # So this code will no longer go into the corresponding callback function.
            # Hence, making the self.softwareEventTrig false, will not be executed at all in 
            # the callback function. Hence it has to be done here.
            self.softwareEventTrig = False
            

    def DriverMarkerButtonCallback(self, data):
        '''
        The data in this callback has a value of 2 when the snapbutton is used 
        to trigger recording a snapshot. The snapbutton has multiple usage, so 
        other values will be for other purposes.
        '''
        if len(data.data) > 1:
            if data.data[1] == 2:
                self.snapButtonTrig = True
                self.snapButtonTrig_waitForTimerCallback = True
            else:
                if not self.snapButtonTrig_waitForTimerCallback:
                    self.snapButtonTrig = False
                    
        
    def CtrlStateFLGcallback(self, data):
        '''
        The data in this callback has some flags (like the following) which 
        becomes some non-zero number when the override happens and then goes back to 
        being zero when the trigger is no longer there.
        '''
        #if self.BRK_Override != bool(data.BRK_Override) and self.BRK_Override == False:
            #self.nBRK_Override += 1
            #print('BRK_Override: {}'.format(self.nBRK_Override))

        if bool(data.BRK_Override):
            self.BRK_Override = True
            self.BRK_Override_waitForTimerCallback = True
        else:
            if not self.BRK_Override_waitForTimerCallback:
                self.BRK_Override = False

        #self.BRK_Override = bool(data.BRK_Override)

        #if self.ACC_Override != bool(data.ACC) and self.ACC_Override == False:
            #self.nACC_Override += 1
            #print('ACC_Override: {}'.format(self.nACC_Override))

        if bool(data.ACC):
            self.ACC_Override = True
            self.ACC_Override_waitForTimerCallback = True
        else:
            if not self.ACC_Override_waitForTimerCallback:
                self.ACC_Override = False

        #self.ACC_Override = bool(data.ACC)

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
        #if self.car == "Mike":
            #self.BRK_Override = bool(data.is_driver_accel)
            #self.ACC_Override = bool(data.is_driver_brake)

        if self.car == "Mike":
            if bool(data.is_driver_accel):
                self.BRK_Override = True
                self.BRK_Override_waitForTimerCallback = True
            else:
                if not self.BRK_Override_waitForTimerCallback:
                    self.BRK_Override = False

            if bool(data.is_driver_brake):
                self.ACC_Override = True
                self.ACC_Override_waitForTimerCallback = True
            else:
                if not self.ACC_Override_waitForTimerCallback:
                    self.ACC_Override = False


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
        self.softwareEventTrigName = data.data
        # print(self.softwareEventTrigName)
        if self.softwareEventTrigName != '':
            self.softwareEventTrig = True
            self.softwareEventTrig_waitForTimerCallback = True
        else:
            if not self.softwareEventTrig_waitForTimerCallback:
                self.softwareEventTrig = False
            

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



