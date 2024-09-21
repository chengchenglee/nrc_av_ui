#!/usr/bin/env python

import rospy
import numpy as np


class BRK_ACC_CLASS:
    def __init__(self):

        self.BRK_Override = False
        self.prev_BRK_Override = False      # Used for creating edge triggers when the flag changes value.
        self.BRK_Override_waitForTimerCallback = False
        self.BRK_Override_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        #self.BRK_Override_wasAutonomousAtFallingEdge = False    # Flag to check if AV was engaged or was autonomous at falling edge of trigger.
        self.BRK_Override_startCheckingForValidity = False
        self.BRK_Override_snapshotValid = False
        self.BRK_OverrideTimer = 0
        self.BRK_Override_startTime = 0
        self.BRK_Override_startPose = None
        self.brkTapDuration = 1         # If brake override is less than this time, it is classified as brake tap.

        self.ACC_Override = False
        self.prev_ACC_Override = False      # Used for creating edge triggers when the flag changes value.
        self.ACC_Override_waitForTimerCallback = False
        self.ACC_Override_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        #self.ACC_Override_wasAutonomousAtFallingEdge = False    # Flag to check if AV was engaged or was autonomous at falling edge of trigger.
        self.ACC_Override_startCheckingForValidity = False
        self.ACC_Override_snapshotValid = False
        self.ACC_OverrideTimer = 0
        self.ACC_Override_startTime = 0
        self.ACC_Override_startPose = None
        

    def process_BRK_Override(self, wasAutonomous, writeSnapshot, prefixList, durationList, startTimeList, distanceList, currentPose):
        '''
        Only enter these 'if' statements a rising or a falling edge of the trigger is detected.
        Previous and current value of the trigger flag is false by start.
        When the trigger is true, current and previous values become different and these 'if' are executed.
        Once inside, the previous value is updated with the current value. Hence, this 'if' will not 
        executed again. 
        Then when the trigger is no longer there, the current value of the trigger is false, so the 
        previous and current values are again different and this 'if' is executed again.
        Then previous value is again made the same as current value (which is false now). So, both the 
        previous and current values of the trigger is again the same and again the 'if' will not be executed. 
        Until another trigger arrives.
        Rising edge of the trigger has current value as true and previous value as false.
        Falling edge of the trigger has current value as false and previous value as true.
        '''
        if self.BRK_Override_startCheckingForValidity:
            # Check if the av was autonomous all the way throughout the entire duration of the trigger.
            self.BRK_Override_snapshotValid &= wasAutonomous
                        
        #if wasAutonomous and (self.BRK_Override != self.prev_BRK_Override):
        if self.BRK_Override != self.prev_BRK_Override:
            #writeSnapshot = True
            self.prev_BRK_Override = self.BRK_Override
            
            if self.prev_BRK_Override:      # Rising edge.
                self.BRK_Override_startTime = rospy.Time.now()
                self.BRK_Override_startPose = currentPose
                self.BRK_Override_wasAutonomousAtRisingEdge = wasAutonomous
                self.BRK_Override_startCheckingForValidity = True
                self.BRK_Override_snapshotValid = wasAutonomous
            else:                           # Falling edge.
                if self.BRK_Override_snapshotValid:
                    writeSnapshot = True             # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
                    self.BRK_OverrideTimer = (rospy.Time.now() - self.BRK_Override_startTime).to_sec()
                    #self.BRK_Override_wasAutonomousAtFallingEdge = wasAutonomous
                    dist = np.sqrt((self.BRK_Override_startPose.pose.position.x - currentPose.pose.position.x)**2 +
                                    (self.BRK_Override_startPose.pose.position.y - currentPose.pose.position.y)**2)
                    
                    # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                    # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                    # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                    # still record a even if the av was disengaged before the falling edge of the trigger. 
                    # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                    #if self.BRK_Override_wasAutonomousAtRisingEdge or self.BRK_Override_wasAutonomousAtFallingEdge:
                    if self.BRK_Override_wasAutonomousAtRisingEdge:
                        if self.BRK_OverrideTimer <= self.brkTapDuration:
                            prefixList.append('brkTap')
                            durationList.append(self.BRK_OverrideTimer)
                            startTimeList.append(self.BRK_Override_startTime)
                            distanceList.append(dist)
                            #print('brkTap')
                        else:            # If a brake override only happens for less than 1 second, then it is called a brake tap.
                            prefixList.append('brkOverride')
                            durationList.append(self.BRK_OverrideTimer)
                            startTimeList.append(self.BRK_Override_startTime)
                            distanceList.append(dist)
                            #print('brkOverride')

                self.BRK_Override_startTime = 0         # Reinitialize.
                self.BRK_Override_startPose = None
                self.BRK_OverrideTimer = 0
                self.BRK_Override_wasAutonomousAtRisingEdge = False
                #self.BRK_Override_wasAutonomousAtFallingEdge = False
                self.BRK_Override_startCheckingForValidity = False
                self.BRK_Override_snapshotValid = False
                
        return writeSnapshot, prefixList, durationList, startTimeList, distanceList


    def process_ACC_Override(self, wasAutonomous, writeSnapshot, prefixList, durationList, startTimeList, distanceList, currentPose):
        '''
        Only enter these 'if' statements a rising or a falling edge of the trigger is detected.
        Previous and current value of the trigger flag is false by start.
        When the trigger is true, current and previous values become different and these 'if' are executed.
        Once inside, the previous value is updated with the current value. Hence, this 'if' will not 
        executed again. 
        Then when the trigger is no longer there, the current value of the trigger is false, so the 
        previous and current values are again different and this 'if' is executed again.
        Then previous value is again made the same as current value (which is false now). So, both the 
        previous and current values of the trigger is again the same and again the 'if' will not be executed. 
        Until another trigger arrives.
        Rising edge of the trigger has current value as true and previous value as false.
        Falling edge of the trigger has current value as false and previous value as true.
        '''
        if self.ACC_Override_startCheckingForValidity:
            # Check if the av was autonomous all the way throughout the entire duration of the trigger.
            self.ACC_Override_snapshotValid &= wasAutonomous            
        
        #if wasAutonomous and (self.ACC_Override != self.prev_ACC_Override):
        if self.ACC_Override != self.prev_ACC_Override:
            #writeSnapshot = True
            self.prev_ACC_Override = self.ACC_Override

            if self.prev_ACC_Override:      # Rising edge.
                self.ACC_Override_startTime = rospy.Time.now()
                self.ACC_Override_startPose = currentPose
                self.ACC_Override_wasAutonomousAtRisingEdge = wasAutonomous
                self.ACC_Override_startCheckingForValidity = True
                self.ACC_Override_snapshotValid = wasAutonomous
            else:                           # Falling edge.
                if self.ACC_Override_snapshotValid:
                    writeSnapshot = True              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
                    self.ACC_OverrideTimer = (rospy.Time.now() - self.ACC_Override_startTime).to_sec()
                    #self.ACC_Override_wasAutonomousAtFallingEdge = wasAutonomous
                    dist = np.sqrt((self.ACC_Override_startPose.pose.position.x - currentPose.pose.position.x)**2 +
                                    (self.ACC_Override_startPose.pose.position.y - currentPose.pose.position.y)**2)

                    # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                    # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                    # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                    # still record a even if the av was disengaged before the falling edge of the trigger. 
                    # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                    #if self.ACC_Override_wasAutonomousAtRisingEdge or self.ACC_Override_wasAutonomousAtFallingEdge:
                    if self.ACC_Override_wasAutonomousAtRisingEdge:
                        prefixList.append('accOverride')
                        durationList.append(self.ACC_OverrideTimer)
                        startTimeList.append(self.ACC_Override_startTime)
                        distanceList.append(dist)
                        #print('accOverride')

                self.ACC_Override_startTime = 0         # Reinitialize.
                self.ACC_Override_startPose = None
                self.ACC_OverrideTimer = 0
                self.ACC_Override_wasAutonomousAtRisingEdge = False
                #self.ACC_Override_wasAutonomousAtFallingEdge = False
                self.ACC_Override_startCheckingForValidity = False
                self.ACC_Override_snapshotValid = False
                
        return writeSnapshot, prefixList, durationList, startTimeList, distanceList
    

