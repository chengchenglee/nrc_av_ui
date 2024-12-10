#!/usr/bin/env python

import rospy
import numpy as np
import tf
from scipy.linalg import inv


class OBJ_OBS:
    def __init__(self, tNow, msg, egoX, egoY, egoYaw):
        orientation_list = [msg.pose.pose.orientation.x, msg.pose.pose.orientation.y,\
                            msg.pose.pose.orientation.z, msg.pose.pose.orientation.w]
        (roll,pitch,yaw) = tf.transformations.euler_from_quaternion(orientation_list)

        self.t = tNow
        self.objId = msg.object_id
        self.classification = msg.classification
        self.motionModel = msg.motion_model
        self.l = round(msg.shape_parameters.x*10)/10
        self.w = round(msg.shape_parameters.y*10)/10
        self.avX = egoX
        self.avY = egoY
        self.avYaw = egoYaw

        dx = egoX - msg.pose.pose.position.x
        dy = egoY - msg.pose.pose.position.y
        self.r = round(np.sqrt(dx*dx + dy*dy)*100)/100
        self.x = round(msg.pose.pose.position.x*100)/100
        self.y = round(msg.pose.pose.position.y*100)/100
        self.th = round(yaw*10000)/10000
    
    

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
        self.relativeDistThresh = 25    # Distance in meters for tracked objects.

        
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


    def process_turnSignalTrig(self, wasAutonomous, writeSnapshot, detailsDict, currentPose, objHist):
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
            self.trackedObjsPresentNearbyDuringTurns = self.areTrackedObjsPresentNearby(currentPose, objHist)
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
                self.trackedObjsPresentNearbyDuringTurns = self.areTrackedObjsPresentNearby(currentPose, objHist)
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


    #def areTrackedObjsPresentNearby(self, currentPose, objHist):
        #'''
        #Function to check if there are nearby objects present near the AV and if there is any 
        #pedestrians among them and whether they are crossing paths with the AV.
        
        #CLASSIFICATION_Unclassified=0
        #CLASSIFICATION_UnknownSmall=1
        #CLASSIFICATION_UnknowBig=2
        #CLASSIFICATION_Pedestrian=3
        #CLASSIFICATION_Bike=4
        #CLASSIFICATION_Car=5
        #CLASSIFICATION_Truck=6

        #MOTIONMODEL_Static=0  # The object is static and will not move.
        #MOTIONMODEL_Movable=1 # The object is movable but no motion has been observed so far.
        #MOTIONMODEL_At_Rest=3 # The object is dynamic but currently not in motion.
        #MOTIONMODEL_Moving=7  # The object is dynamic and currently in motion.
        #'''
        #avX = currentPose.pose.position.x
        #avY = currentPose.pose.position.y
        
        #print('here')
        
        #for trkObj in objHist:
            #objX = trkObj[-1].x
            #objY = trkObj[-1].y
            #objClass = trkObj[-1].classification
            #objMotion = trkObj[-1].motion_model
            
            #objTrajPtsX, objTrajPtsY = [], []
            #avTrajPtsX, avTrajPtsY = [], []
            #if objClass == 3:       # If there are pedestrians nearby.
                #print(objClass, ' detected')
                #for obj in trkObj:
                    #objTrajPtsX.append(obj.x)
                    #objTrajPtsY.append(obj.y)
                    #avTrajPtsX.append(avX)
                    #avTrajPtsY.append(avY)
                    
            #if len(objTrajPtsX) < 1:    # Not enough points to generate trajectory function.
                #continue

            #objM, objC = np.polyfit(np.array(objTrajPtsX), np.array(objTrajPtsY), 1)   # Fitting a straight line through the trajectory.
            #avM, avC = np.polyfit(np.array(avTrajPtsX), np.array(avTrajPtsY), 1)   # Fitting a straight line through the trajectory.
            #intPtX = (objC - avC) / (avM - objM + 0.00000001)       # Finding out the point of intersection between the two trajectories.
            #intPtY = objM * intPtX + objC
            #latestAvX, latestAvY = avTrajPtsX[-1], avTrajPtsY[-1]
            #intPtDist = round(np.sqrt(intPtX*latestAvX + intPtY*latestAvY)*100)/100
            
            #if intPtDist < self.relativeDistThresh:     # If the point of intersection is within some distance from the vehicle.
                #return True
            #else:
                #continue
            
        #return False


    def checkRelativeObjPos(self, obj):
        '''
        This function takes in an OBJ_OBS object and calculates the object position 
        in the vehicle frame at the corresponding instant.
        '''
        trMat = np.zeros((3,3))
        trMat[0,0] = np.cos(obj.avYaw)
        trMat[0,1] = np.sin(obj.avYaw)
        trMat[1,0] = -np.sin(obj.avYaw)
        trMat[1,1] = np.cos(obj.avYaw)
        trMat[2,2] = 1
        trMat[0,2] = obj.avX
        trMat[1,2] = obj.avY
        trMatInv = inv(trMat)

        pedPoint = np.zeros((3,1))
        pedPoint[0,0] = obj.x
        pedPoint[1,0] = obj.y
        pedPoint[2,0] = 1
        
        pedPointInCarFrm = np.dot(trMatInv, pedPoint)
        dist = np.sqrt(pedPointInCarFrm[0]*pedPointInCarFrm[0] + pedPointInCarFrm[1]*pedPointInCarFrm[1])
        
        return pedPointInCarFrm[0], pedPointInCarFrm[1], dist
        

    def areTrackedObjsPresentNearby(self, currentPose, objHist):
        '''
        Function to check if there are nearby objects present near the AV and if there is any 
        pedestrians among them and whether they are crossing paths with the AV.
        
        CLASSIFICATION_Unclassified=0
        CLASSIFICATION_UnknownSmall=1
        CLASSIFICATION_UnknowBig=2
        CLASSIFICATION_Pedestrian=3
        CLASSIFICATION_Bike=4
        CLASSIFICATION_Car=5
        CLASSIFICATION_Truck=6

        MOTIONMODEL_Static=0  # The object is static and will not move.
        MOTIONMODEL_Movable=1 # The object is movable but no motion has been observed so far.
        MOTIONMODEL_At_Rest=3 # The object is dynamic but currently not in motion.
        MOTIONMODEL_Moving=7  # The object is dynamic and currently in motion.
        '''
        pedCount = 0
        for trkObj in objHist:
            objClass = trkObj[-1].classification
            if objClass == 3:       # If there are pedestrians nearby.
                pedCount += 1
                firstInstantXval, firstInstantYval, firstDist = self.checkRelativeObjPos(trkObj[0])
                lastInstantXval, lastInstantYval, lastDist = self.checkRelativeObjPos(trkObj[-1])
                
                #print(pedCount, firstInstantXval, firstInstantYval, lastInstantXval, lastInstantYval)

                # Checking if the y coordinate of the object has changed from +ve to -ve in the car frame.
                # This will imply that the pedestrian has moved from the right of the car to the left or viceversa.
                if firstInstantYval * lastInstantYval < 0:
                    #print('here', pedCount, firstInstantXval, firstInstantYval, lastInstantXval, lastInstantYval)
                    return True
            
        return False


    def processSignal(self, wasAutonomous, writeSnapshot, detailsDict, currentPose, objHist, timerInterval, yaw):
        
        self.updateTurnSignalTrig(timerInterval, yaw)
        writeSnapshot, detailsDict = self.process_turnSignalTrig(wasAutonomous, writeSnapshot, detailsDict, currentPose, objHist)
        
        return writeSnapshot, detailsDict



class LEFT_RIGHT_CLASS:
    def __init__(self):

        self.Right = DIRECTION('Right')
        self.Left = DIRECTION('Left')
        
        
    
    
    
    
    
    
    
    
    
    
    
