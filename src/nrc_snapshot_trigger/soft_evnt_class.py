#!/usr/bin/env python

import rospy
import numpy as np


class SOFT_EVNT_CLASS:
    def __init__(self):
        
        self.softwareEventTrig = False
        self.prev_softwareEventTrig = False     # Used for creating edge triggers when the flag changes value.
        self.softwareEventTrig_waitForTimerCallback = False
        self.softwareEventTrig_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        #self.softwareEventTrig_wasAutonomousAtFallingEdge = False    # Flag to check if AV was engaged or was autonomous at falling edge of trigger.
        self.softwareEventTrig_startCheckingForValidity = False
        self.softwareEventTrig_snapshotValid = False
        self.softwareEventTrigTimer = 0
        self.softwareEventTrig_startTime = 0
        self.softwareEventTrig_startPose = None
        self.softwareEventTrigName = ''

        
        
    def process_softwareEventTrig(self, wasAutonomous, writeSnapshot, prefixList, durationList, startTimeList, distanceList, currentPose):
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
        if self.softwareEventTrig_startCheckingForValidity:
            # Check if the av was autonomous all the way throughout the entire duration of the trigger.
            self.softwareEventTrig_snapshotValid &= wasAutonomous
        
        #if wasAutonomous and (self.softwareEventTrig != self.prev_softwareEventTrig):
        if self.softwareEventTrig != self.prev_softwareEventTrig:
            #writeSnapshot = True
            self.prev_softwareEventTrig = self.softwareEventTrig

            if self.prev_softwareEventTrig:  # Rising edge.
                self.softwareEventTrig_startTime = rospy.Time.now()
                self.softwareEventTrig_startPose = currentPose
                self.softwareEventTrig_wasAutonomousAtRisingEdge = wasAutonomous
                self.softwareEventTrig_startCheckingForValidity = True
                self.softwareEventTrig_snapshotValid = wasAutonomous
            else:                           # Falling edge.
                if self.softwareEventTrig_snapshotValid:
                    writeSnapshot = wasAutonomous              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
                    self.softwareEventTrigTimer = (rospy.Time.now() - self.softwareEventTrig_startTime).to_sec()
                    #self.softwareEventTrig_wasAutonomousAtFallingEdge = wasAutonomous
                    dist = np.sqrt((self.softwareEventTrig_startPose.pose.position.x - currentPose.pose.position.x)**2 +
                                    (self.softwareEventTrig_startPose.pose.position.y - currentPose.pose.position.y)**2)

                    # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                    # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                    # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                    # still record a even if the av was disengaged before the falling edge of the trigger. 
                    # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                    #if self.softwareEventTrig_wasAutonomousAtRisingEdge or self.softwareEventTrig_wasAutonomousAtFallingEdge:
                    if self.softwareEventTrig_wasAutonomousAtRisingEdge:
                        prefixList.append(str(self.softwareEventTrigName))
                        durationList.append(self.softwareEventTrigTimer)
                        startTimeList.append(self.softwareEventTrig_startTime)
                        distanceList.append(dist)

                self.softwareEventTrig_startTime = 0        # Reinitialize.
                self.softwareEventTrig_startPose = None
                self.softwareEventTrigTimer = 0
                self.softwareEventTrig_wasAutonomousAtRisingEdge = False
                #self.softwareEventTrig_wasAutonomousAtFallingEdge = False
                self.softwareEventTrig_startCheckingForValidity = False
                self.softwareEventTrig_snapshotValid = False

                
        return writeSnapshot, prefixList, durationList, startTimeList, distanceList
