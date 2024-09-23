#!/usr/bin/env python

import rospy
import numpy as np

class PEDAL:
    def __init__(self, pedalName):
        
        self.pedalName = pedalName

        self.override = False
        self.prev_override = False      # Used for creating edge triggers when the flag changes value.
        self.override_waitForTimerCallback = False
        self.override_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        #self.override_wasAutonomousAtFallingEdge = False    # Flag to check if AV was engaged or was autonomous at falling edge of trigger.
        self.override_startCheckingForValidity = False
        self.override_snapshotValid = False
        self.overrideTimer = 0
        self.override_startTime = 0
        self.override_startPose = None
        self.brkTapDuration = 1         # If brake override is less than this time, it is classified as brake tap.


    def process_override(self, wasAutonomous, writeSnapshot, detailsDict, currentPose):
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
        if self.override_startCheckingForValidity:
            # Check if the av was autonomous all the way throughout the entire duration of the trigger.
            self.override_snapshotValid &= wasAutonomous
                        
        #if wasAutonomous and (self.override != self.prev_override):
        if self.override != self.prev_override:
            #writeSnapshot = True
            self.prev_override = self.override
            
            if self.prev_override:      # Rising edge.
                self.override_startTime = rospy.Time.now()
                self.override_startPose = currentPose
                self.override_wasAutonomousAtRisingEdge = wasAutonomous
                self.override_startCheckingForValidity = True
                self.override_snapshotValid = wasAutonomous
            else:                           # Falling edge.
                if self.override_snapshotValid:
                    writeSnapshot = True             # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
                    self.overrideTimer = (rospy.Time.now() - self.override_startTime).to_sec()
                    #self.override_wasAutonomousAtFallingEdge = wasAutonomous
                    dist = np.sqrt((self.override_startPose.pose.position.x - currentPose.pose.position.x)**2 +
                                    (self.override_startPose.pose.position.y - currentPose.pose.position.y)**2)
                    
                    # Sometimes av can get disengaged while an override is still active. If av is engaged for the entire time of 
                    # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                    # is true for the entire time of the override, only then the override is recorded in the snapshot. 
                    #if self.override_wasAutonomousAtRisingEdge or self.override_wasAutonomousAtFallingEdge:
                    if self.override_wasAutonomousAtRisingEdge:
                        if self.overrideTimer <= self.brkTapDuration and self.pedalName == 'brk':
                            detailsDict['prefixList'].append('{}Tap'.format(self.pedalName))
                        else:            # If a brake override only happens for less than 1 second, then it is called a brake tap.
                            detailsDict['prefixList'].append('{}Override'.format(self.pedalName))

                        detailsDict['durationList'].append(self.overrideTimer)
                        detailsDict['startTimeList'].append(self.override_startTime)
                        detailsDict['distanceList'].append(dist)
                        #print('{}Override'.format(self.pedalName))

                self.override_startTime = 0         # Reinitialize.
                self.override_startPose = None
                self.overrideTimer = 0
                self.override_wasAutonomousAtRisingEdge = False
                #self.override_wasAutonomousAtFallingEdge = False
                self.override_startCheckingForValidity = False
                self.override_snapshotValid = False
                
        return writeSnapshot, detailsDict


class BRK_ACC_CLASS:
    def __init__(self):
        
        self.BRK = PEDAL('brk')
        self.ACC = PEDAL('acc')

























































