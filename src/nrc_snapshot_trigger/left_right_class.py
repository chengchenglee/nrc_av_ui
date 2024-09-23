#!/usr/bin/env python

import rospy
import numpy as np

class DIRECTION:
    def __init__(self, direction):
        
        self.direction = direction
        
        self.turnSignalVal = False
        self.turnSignalCheckTimer = 0
        self.turnSignalActive = False
        self.turnSignalCheckTimer = 0
        self.turnEventName = ''                  # Defines is its a 'laneChange' or 'vehicleTurned'.
        self.yawAtStart = None
        self.yawAtEnd = None
        self.prev_turnSignalActive = False
        self.turnSignalActive_wasAutonomousAtRisingEdge = False
        #self.turnSignalActive_wasAutonomousAtFallingEdge = False
        self.turnSignalActive_startCheckingForValidity = False
        self.turnSignalActive_snapshotValid = False
        self.turnSignalActive_startTime = 0
        self.turnSignalActive_startPose = None
        self.turnSignalActiveTimer = 0
        self.trackedObjsPresentNearbyDuringTurns = False
        self.turnSignalCheckTimerThresh = 2      # Time in seconds needed to check if turn signal is still active or not.
        self.yawChangeThresh = 0.26      # 15 degrees. If change in yaw is more than this threshold, then it is a vehicle turn and not lane change.
        self.relativeDistThresh = 15    # Distance in meters for tracked objects.

        
    def updateTurnSignalTrig(self, timerInterval, yaw):        
        # This function sets the turnSignalActive flag high as long as there is a turn signal turned on.
        # And makes it low, 2 seconds after the turn signal is turned off.
        if not self.turnSignalVal:
            self.turnSignalCheckTimer += timerInterval
            
            # If turn signal stays 0 for more than 2 seconds, then turnSignalActive is made false.
            if self.turnSignalCheckTimer > self.turnSignalCheckTimerThresh:
                if self.turnSignalActive:
                    self.turnSignalActive = False
                    
                    if self.yawAtEnd is None:   # Only update this once at the end of the turn.
                        self.yawAtEnd = yaw

                    if abs(self.yawAtEnd - self.yawAtStart) > self.yawChangeThresh:
                        self.turnEventName = 'vehicleTurned{}'.format(self.direction)
                    else:
                        self.turnEventName = 'laneChangeRight{}'.format(self.direction)
                
                self.turnSignalCheckTimer = 0        # Reset timer.
                
        else:
            self.turnSignalActive = True
            self.turnSignalCheckTimer = 0            # Reset timer.
            
            if self.yawAtStart is None:   # Only update this once at the beginning of the turn.
                self.yawAtStart = yaw 


    def process_turnSignalTrig(self, wasAutonomous, writeSnapshot, detailsDict, currentPose, trackedObjList):
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
        if self.turnSignalActive_startCheckingForValidity:
            # Check if the av was autonomous all the way throughout the entire duration of the trigger.
            self.turnSignalActive_snapshotValid &= wasAutonomous

            # Turns and lane changes are included in the snapshots only if there are some desired tracked objects 
            # present near the AV during anytime during the duration of the turn or lane change.
            self.trackedObjsPresentNearbyDuringTurns = self.areTrackedObjsPresentNearby(currentPose, trackedObjList)
            self.turnSignalActive_snapshotValid |= self.trackedObjsPresentNearbyDuringTurns            

        #if wasAutonomous and (self.turnSignalActive != self.prev_turnSignalActive):
        if self.turnSignalActive != self.prev_turnSignalActive:
            #writeSnapshot = True
            self.prev_turnSignalActive = self.turnSignalActive

            if self.prev_turnSignalActive:  # Rising edge.
                self.turnSignalActive_startTime = rospy.Time.now()
                self.turnSignalActive_startPose = currentPose
                self.turnSignalActive_wasAutonomousAtRisingEdge = wasAutonomous
                self.turnSignalActive_startCheckingForValidity = True
                self.trackedObjsPresentNearbyDuringTurns = self.areTrackedObjsPresentNearby(currentPose, trackedObjList)
                self.turnSignalActive_snapshotValid = wasAutonomous and self.trackedObjsPresentNearbyDuringTurns

            else:                           # Falling edge.
                if self.turnSignalActive_snapshotValid:
                #if self.trackedObjsPresentNearbyDuringTurns:
                    writeSnapshot = wasAutonomous              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
                    self.turnSignalActiveTimer = (rospy.Time.now() - self.turnSignalActive_startTime).to_sec()
                    #self.turnSignalActive_wasAutonomousAtFallingEdge = wasAutonomous
                    dist = np.sqrt((self.turnSignalActive_startPose.pose.position.x - currentPose.pose.position.x)**2 +
                                    (self.turnSignalActive_startPose.pose.position.y - currentPose.pose.position.y)**2)

                    
                    # Sometimes av can get disengaged while an override is still active. If av is engaged for the entire time of 
                    # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                    # is true for the entire time of the override, only then the override is recorded in the snapshot. 
                    #if self.turnSignalActive_wasAutonomousAtRisingEdge or self.turnSignalActive_wasAutonomousAtFallingEdge:
                    if self.turnSignalActive_wasAutonomousAtRisingEdge:
                        detailsDict['prefixList'].append(self.turnEventName)
                        detailsDict['durationList'].append(self.turnSignalActiveTimer)
                        detailsDict['startTimeList'].append(self.turnSignalActive_startTime)
                        detailsDict['distanceList'].append(dist)

                self.turnSignalActive_startTime = 0        # Reinitialize.
                self.turnSignalActive_startPose = None
                self.turnSignalActiveTimer = 0
                self.turnSignalActive_wasAutonomousAtRisingEdge = False
                #self.turnSignalActive_wasAutonomousAtFallingEdge = False
                self.turnSignalActive_startCheckingForValidity = False
                self.turnSignalActive_snapshotValid = False
                self.turnEventName = ''
                self.yawAtEnd = None
                self.yawAtStart = None
                self.trackedObjsPresentNearbyDuringTurns = False
                
        return writeSnapshot, detailsDict


    def areTrackedObjsPresentNearby(self, currentPose, trackedObjList):
        '''
        Function to check if there are nearby objects present near the AV withing some threshold distance.
        Even if one object of interest present nearby within the distance threshold, then the function 
        returns true. Else false.
        
        CLASSIFICATION_Unclassified=0
        CLASSIFICATION_UnknownSmall=1
        CLASSIFICATION_UnknowBig=2
        CLASSIFICATION_Pedestrian=3
        CLASSIFICATION_Bike=4
        CLASSIFICATION_Car=5
        CLASSIFICATION_Truck=6

        MOTIONMODEL_Static=0  # The object is static and will not move
        MOTIONMODEL_Movable=1 # The object is movable but no motion has been observed so far
        MOTIONMODEL_At_Rest=3 # The object is dynamic but currently not in motion
        MOTIONMODEL_Moving=7  # The object is dynamic and currently in motion
        '''
        avX = currentPose.pose.position.x
        avY = currentPose.pose.position.y
        
        for obj in trackedObjList:
            objX = obj.pose.pose.position.x
            objY = obj.pose.pose.position.y
            objClass = obj.classification
            objMotion = obj.motion_model
            
            # If there are moving or movable objects nearby.
            if objClass > 2 and objClass <= 6 and objMotion > 0:
                dist = np.sqrt((objX - avX)**2 + (objY - avY)**2)
                
                if dist < self.relativeDistThresh:
                    return True
                else:
                    continue
            else:
                continue
            
        return False


    def processSignal(self, wasAutonomous, writeSnapshot, detailsDict, currentPose, trackedObjList, timerInterval, yaw):
        
        self.updateTurnSignalTrig(timerInterval, yaw)
        writeSnapshot, detailsDict = self.process_turnSignalTrig(wasAutonomous, writeSnapshot, detailsDict, currentPose, trackedObjList)
        
        return writeSnapshot, detailsDict



class LEFT_RIGHT_CLASS:
    def __init__(self):

        self.Right = DIRECTION('Right')
        self.Left = DIRECTION('Left')
        
        
    
    
    
    
    
    
    
    
    
    
    
