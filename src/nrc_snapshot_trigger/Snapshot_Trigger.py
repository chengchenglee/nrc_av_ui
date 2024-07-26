#!/usr/bin/env python

import rospy
from std_msgs.msg import Empty
from std_msgs.msg import String
from std_msgs.msg import Int32MultiArray
from std_msgs.msg import Int16
from diagnostic_msgs.msg import DiagnosticArray
import numpy as np
from nrc_msgs.msg import CtrlStateFLG
#from nrc_msgs.msg import SnapShotTrigger
import time
import subprocess
import os

## AWS boto3 implementation
#import boto3
#import botocore
#from botocore.errorfactory import ClientError
#from threading import Thread
#from time import sleep
#import progressbar


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
        self.writeTimeDuration = 20         # The buffering is done for 40 sec (location: ~/projects/nrc_ws/src/nrc_svcs/scripts/rosbagSnapshot.sh)
        self.prefixList = []
        self.snapshotUpdated = False
        self.filename = ''
        self.csvDir = os.path.join(os.path.expanduser("~"), 'projects/disengagementData/', time.strftime("%Y%m%d"),'bags')
        
        ## AWS variables
        #self.session = boto3.Session(profile_name='foxtrot')
        #self.s3 = self.session.resource('s3')
        #self.s3Client = self.session.client('s3')
        #self.rospyUp = False

        # Vehicle health publisher
        self.pub = rospy.Publisher('health_status', DiagnosticArray, queue_size=10)
        
        rospy.init_node('Snapshot_Trigger')
        
        # Create a ROS Timer for reading data
        rospy.Timer(rospy.Duration(self.timerInterval), self.timerCallback)
    
    
    def timerCallback(self, data):            # Interval decided by timerInterval.
        if self.avEngaged and self.BRK_Override:
            self.writeSnapshot = True
            self.prefixList.append('brkOverride')
            self.BRK_OverrideTimer += self.timerInterval
        
        if self.avEngaged and self.ACC_Override:
            self.writeSnapshot = True
            self.prefixList.append('accOverride')
            self.ACC_OverrideTimer += self.timerInterval
        
        if self.avEngaged and self.snapButton == 8:
            self.writeSnapshot = True
            self.prefixList.append('snapButton')
            self.snapButtonTimer += self.timerInterval
            
        if self.avEngaged and self.software_EVNT_trigger:
            self.writeSnapshot = True
            self.prefixList.append(str(self.softwareEventName))
            self.softwareEventTimer += self.timerInterval


        if self.avEngaged:
            self.updateThisCycle = True
            self.avEngagedTimer += self.timerInterval
        
        if (not self.avEngaged) and self.updateThisCycle:
            self.writeSnapshot = True
            self.prefixList.append('avDisengaged')
        
            
        # Arranging the name of the prefix for saving files.
        #self.prefixList.sort()
        self.prefixList = list(set(self.prefixList))      # This removes any duplicate trigger names in the prefix.
        
        
        if self.writeSnapshot:
            self.writeTime += self.timerInterval
            
        
        if self.writeSnapshot and self.writeTime > self.writeTimeDuration:
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
                #cmd = "cd " + self.csvDir + ";rosrun rosbag_snapshot snapshot -t -n -O {}.bag".format(self.filename)
                cmd = "cd " + self.csvDir + ";rosrun rosbag_snapshot snapshot -t -O {}.bag".format(self.filename)
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
            self.updateThisCycle = False
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

    #def callback(self, data):
        #pass
        ##print ('message received')
    
        #publishStr = 'Vehicle_Health'
        #self.pub.publish(publishStr)
        

    def DriverMarkerButtonCallback(self, data):
        '''
        The data in this callback has a value of 8 when the snapbutton is used 
        to trigger recording a snapshot. The snapbutton has multiple usage, so 
        other values will be for other purposes.
        '''
        self.snapButton = data.data
        #if self.snapButton > 0:
            #print('\n\n snapbutton value: {} \n\n'.format(self.snapButton))
        
        
    def CtrlStateFLGcallback(self, data):
        '''
        The data in this callback has some flags (like the following) which 
        becomes some non-zero number when the override happens and then goes back to 
        being zero when the trigger is no longer there.
        '''
        self.BRK_Override = bool(data.BRK_Override)
        self.ACC_Override = bool(data.ACC)
        self.avEngaged = bool(data.Engaged)
        self.avEngaged = True


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
        

        
    #def upload_to_aws(self, local_file, s3_bucket, s3_folder, s3_filename):
        #def write_to_aws():
            #statinfo = os.stat(local_file)
            #up_progress = progressbar.progressbar.ProgressBar(maxval=statinfo.st_size)
            #up_progress.start()

            #def upload_progress(chunk):
               #up_progress.update(up_progress.currval + chunk)

            #try:
               #print("Writing "+ s3_filename)
               #self.s3Client.upload_file(local_file, s3_bucket, s3_folder+"/"+s3_filename, Callback=upload_progress)
               #print("Upload Successful")
               #return True
            #except FileNotFoundError:
               #print("The source file was not found")
               #return False
            #except NoCredentialsError:
               #print("Credentials not available")
               #return False
        #try:
            ##print('bucket: ' + s3_bucket + ", key: " + s3_folder+s3_filename+'/')
            #self.s3Client.head_object(Bucket=s3_bucket, Key=s3_folder+'/'+s3_filename)
            ##print(s3_filename + " exists already, not uploading")
        #except ClientError as e:
            #write_to_aws()
        
        
    #def awsSessionStart(self, data):
        #bucket = 'foxtrot-snapshots'
        #s3_folder = 'snapshot_bagfiles'+'/'+time.strftime("%Y%m%d")
        #while self.rospyUp:
            #if os.path.isdir(self.csvDir):
                #for filename in os.listdir(self.csvDir):
                    #fullPath = self.csvDir+'/'+filename
                    #self.upload_to_aws(fullPath,bucket,s3_folder,filename)
                    ##print(filename)
            #else:
                #pass
                ##print("Dir does not exist")
            #sleep(60)


    def listener(self):
        rospy.Subscriber('/software_event_trigger', String, self.SoftwareEventTriggerCallback)
        
        rospy.Subscriber('/CtrlStateFLG', CtrlStateFLG, self.CtrlStateFLGcallback)
        rospy.Subscriber('/driver_marker_button', Int16, self.DriverMarkerButtonCallback)
        #rospy.Subscriber('/CtrlStateFLGDummy', Int32MultiArray, self.dummyCallback)
        
        ##Start aws thread
        #self.rospyUp = True
        #thread = Thread(target = self.awsSessionStart, args = (self, ))
        #thread.daemon = True
        #thread.start()

        while not rospy.is_shutdown():
            
            #print(self.avEngaged, self.updateThisCycle, self.writeSnapshot, self.BRK_Override, self.ACC_Override)
            #print('\n\n snapbutton value: {} \n\n'.format(self.snapButton))
            
            rospy.sleep(1)  # sleep for one second.
        
        ##Join aws thread
        #self.rospyUp = False
        #thread.join()
        
if __name__ == '__main__':
    print ('Running')
    clsObj = CsvWriterAVinterface()
    clsObj.listener()



