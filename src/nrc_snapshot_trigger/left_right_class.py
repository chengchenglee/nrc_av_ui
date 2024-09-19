#!/usr/bin/env python

import rospy
import numpy as np


class LEFT_RIGHT_CLASS:
    def __init__(self):

        self.turnSignalValR = False
        self.turnSignalCheckTimerR = 0
        self.turnSignalActiveR = False
        self.turnSignalCheckTimerR = 0
        self.turnEventNameR = ''                  # Defines is its a 'laneChange' or 'vehicleTurned'.
        self.yawAtStartR = None
        self.yawAtEndR = None
        self.prev_turnSignalActiveR = False
        self.turnSignalActiveR_wasAutonomousAtRisingEdge = False
        #self.turnSignalActiveR_wasAutonomousAtFallingEdge = False
        self.turnSignalActiveR_startTime = 0
        self.turnSignalActiveTimerR = 0
        self.trackedObjsPresentNearbyDuringTurnsR = False
        
        self.turnSignalValL = False
        self.turnSignalCheckTimerL = 0
        self.turnSignalActiveL = False
        self.turnSignalCheckTimerL = 0
        self.turnEventNameL = ''                  # Defines is its a 'laneChange' or 'vehicleTurned'.
        self.yawAtStartL = None
        self.yawAtEndL = None
        self.prev_turnSignalActiveL = False
        self.turnSignalActiveL_wasAutonomousAtRisingEdge = False
        #self.turnSignalActiveL_wasAutonomousAtFallingEdge = False
        self.turnSignalActiveL_startTime = 0
        self.turnSignalActiveTimerL = 0
        self.trackedObjsPresentNearbyDuringTurnsL = False
        
        self.turnSignalCheckTimerThresh = 2      # Time in seconds needed to check if turn signal is still active or not.
        self.yawChangeThresh = 0.26      # 15 degrees. If change in yaw is more than this threshold, then it is a vehicle turn and not lane change.
        self.relativeDistThresh = 15    # Distance in meters for tracked objects.
        

                
    def updateTurnSignalTrigR(self, timerInterval, yaw):        
        # This function sets the turnSignalActiveR flag high as long as there is a turn signal turned on.
        # And makes it low, 2 seconds after the turn signal is turned off.
        if not self.turnSignalValR:
            self.turnSignalCheckTimerR += timerInterval
            
            # If turn signal stays 0 for more than 2 seconds, then turnSignalActiveR is made false.
            if self.turnSignalCheckTimerR > self.turnSignalCheckTimerThresh:
                if self.turnSignalActiveR:
                    self.turnSignalActiveR = False
                    
                    if self.yawAtEndR is None:   # Only update this once at the end of the turn.
                        self.yawAtEndR = yaw

                    if abs(self.yawAtEndR - self.yawAtStartR) > self.yawChangeThresh:
                        self.turnEventNameR = 'vehicleTurnedRight'
                    else:
                        self.turnEventNameR = 'laneChangeRight'
                
                self.turnSignalCheckTimerR = 0        # Reset timer.
                
        else:
            self.turnSignalActiveR = True
            self.turnSignalCheckTimerR = 0            # Reset timer.
            
            if self.yawAtStartR is None:   # Only update this once at the beginning of the turn.
                self.yawAtStartR = yaw 



    def updateTurnSignalTrigL(self, timerInterval, yaw):
        # This function sets the turnSignalActiveL flag high as long as there is a turn signal turned on.
        # And makes it low, 2 seconds after the turn signal is turned off.
        if not self.turnSignalValL:
            self.turnSignalCheckTimerL += timerInterval
            
            # If turn signal stays 0 for more than 2 seconds, then turnSignalActiveL is made false.
            if self.turnSignalCheckTimerL > self.turnSignalCheckTimerThresh:
                if self.turnSignalActiveL:
                    self.turnSignalActiveL = False
                    
                    if self.yawAtEndL is None:   # Only update this once at the end of the turn.
                        self.yawAtEndL = yaw

                    if abs(self.yawAtEndL - self.yawAtStartL) > self.yawChangeThresh:
                        self.turnEventNameL = 'vehicleTurnedLeft'
                    else:
                        self.turnEventNameL = 'laneChangeLeft'
                
                self.turnSignalCheckTimerL = 0        # Reset timer.
                
        else:
            self.turnSignalActiveL = True
            self.turnSignalCheckTimerL = 0            # Reset timer.
            
            if self.yawAtStartL is None:   # Only update this once at the beginning of the turn.
                self.yawAtStartL = yaw 
                


    def process_turnSignalTrigR(self, wasAutonomous, writeSnapshot, prefixList, durationList, startTimeList, currentPose, trackedObjList):
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

        #if wasAutonomous and (self.turnSignalActiveR != self.prev_turnSignalActiveR):
        if self.turnSignalActiveR != self.prev_turnSignalActiveR:
            #writeSnapshot = True
            self.prev_turnSignalActiveR = self.turnSignalActiveR

            if self.prev_turnSignalActiveR:  # Rising edge.
                # Turns and lane changes are included in the snapshots only if there are some desired tracked objects 
                # present near the AV during the beginning of the turn or lane change.
                self.trackedObjsPresentNearbyDuringTurnsR = self.areTrackedObjsPresentNearby(currentPose, trackedObjList)

                if self.trackedObjsPresentNearbyDuringTurnsR:
                    self.turnSignalActiveR_startTime = rospy.Time.now()
                    self.turnSignalActiveR_wasAutonomousAtRisingEdge = wasAutonomous
                    writeSnapshot = wasAutonomous              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
            else:                           # Falling edge.
                if self.trackedObjsPresentNearbyDuringTurnsR:
                    self.turnSignalActiveTimerR = (rospy.Time.now() - self.turnSignalActiveR_startTime).to_sec()
                    #self.turnSignalActiveR_wasAutonomousAtFallingEdge = wasAutonomous
                    
                    # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                    # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                    # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                    # still record a even if the av was disengaged before the falling edge of the trigger. 
                    # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                    #if self.turnSignalActive_wasAutonomousAtRisingEdge or self.turnSignalActive_wasAutonomousAtFallingEdge:
                    if self.turnSignalActiveR_wasAutonomousAtRisingEdge:
                        prefixList.append(self.turnEventNameR)
                        durationList.append(self.turnSignalActiveTimerR)
                        startTimeList.append(self.turnSignalActiveR_startTime)

                    self.turnSignalActiveR_startTime = 0        # Reinitialize.
                    self.turnSignalActiveTimerR = 0
                    self.turnSignalActiveR_wasAutonomousAtRisingEdge = False
                    #self.turnSignalActiveR_wasAutonomousAtFallingEdge = False
                    self.turnEventNameR = ''
                    self.yawAtEndR = None
                    self.yawAtStartR = None
                    self.trackedObjsPresentNearbyDuringTurnsR = False
                
        return writeSnapshot, prefixList, durationList, startTimeList
    


    def process_turnSignalTrigL(self, wasAutonomous, writeSnapshot, prefixList, durationList, startTimeList, currentPose, trackedObjList):
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

        #if wasAutonomous and (self.turnSignalActiveL != self.prev_turnSignalActiveL):
        if self.turnSignalActiveL != self.prev_turnSignalActiveL:
            #writeSnapshot = True
            self.prev_turnSignalActiveL = self.turnSignalActiveL
            
            if self.prev_turnSignalActiveL:  # Rising edge.
                # Turns and lane changes are included in the snapshots only if there are some desired tracked objects 
                # present near the AV during the beginning of the turn or lane change.
                self.trackedObjsPresentNearbyDuringTurnsL = self.areTrackedObjsPresentNearby(currentPose, trackedObjList)
                
                if self.trackedObjsPresentNearbyDuringTurnsL:
                    self.turnSignalActiveL_startTime = rospy.Time.now()
                    self.turnSignalActiveL_wasAutonomousAtRisingEdge = wasAutonomous
                    writeSnapshot = wasAutonomous              # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
            else:                           # Falling edge.
                if self.trackedObjsPresentNearbyDuringTurnsL:
                    self.turnSignalActiveTimerL = (rospy.Time.now() - self.turnSignalActiveL_startTime).to_sec()
                    #self.turnSignalActiveL_wasAutonomousAtFallingEdge = wasAutonomous
                    
                    # Sometimes av can get disengaged while an override is still active. If av was disengaged for the entire time of 
                    # the duration of the override, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec), 
                    # then those overrides are ignored. But if the av was engaged during the rising edge of the trigger, then it will 
                    # still record a even if the av was disengaged before the falling edge of the trigger. 
                    # So, only record this trigger if the av was engaged at atleast one of the rising or falling edge of this trigger.
                    #if self.turnSignalActive_wasAutonomousAtRisingEdge or self.turnSignalActive_wasAutonomousAtFallingEdge:
                    if self.turnSignalActiveL_wasAutonomousAtRisingEdge:
                        prefixList.append(self.turnEventNameL)
                        durationList.append(self.turnSignalActiveTimerL)
                        startTimeList.append(self.turnSignalActiveL_startTime)

                    self.turnSignalActiveL_startTime = 0        # Reinitialize.
                    self.turnSignalActiveTimerL = 0
                    self.turnSignalActiveL_wasAutonomousAtRisingEdge = False
                    #self.turnSignalActiveL_wasAutonomousAtFallingEdge = False
                    self.turnEventNameL = ''
                    self.yawAtEndL = None
                    self.yawAtStartL = None
                    self.trackedObjsPresentNearbyDuringTurnsL = False
                
        return writeSnapshot, prefixList, durationList, startTimeList
    
    
    
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


    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    



