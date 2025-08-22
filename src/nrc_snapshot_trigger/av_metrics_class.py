#!/usr/bin/env python

import rospy
import numpy as np

class METRIC:
    def __init__(self, metricName):
        
        self.metricName = metricName

        self.metricTrig = False
        self.prev_metricTrig = False      # Used for creating edge triggers when the flag changes value.
        self.metricTrig_waitForTimerCallback = False
        self.metricTrig_wasAutonomousAtRisingEdge = False     # Flag to check if AV was engaged or was autonomous at rising edge of trigger.
        self.metricTrig_startCheckingForValidity = False
        self.metricTrig_snapshotValid = False
        self.metricTrigTimer = 0
        self.metricTrig_startTime = 0
        self.metricTrig_startPose = None
        self.prev_metricValue = None


    def process_metricTrig(self, wasAutonomous, writeSnapshot, detailsDict, currentPose):
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

        self.metricTrig_waitForTimerCallback = False

        if self.metricTrig_startCheckingForValidity:
            # Check if the av was autonomous all the way throughout the entire duration of the trigger.
            self.metricTrig_snapshotValid &= wasAutonomous
                        
        #if wasAutonomous and (self.metricTrig != self.prev_metricTrig):
        if self.metricTrig != self.prev_metricTrig:
            #writeSnapshot = True
            self.prev_metricTrig = self.metricTrig
            
            if self.prev_metricTrig:      # Rising edge.
                self.metricTrig_startTime = rospy.Time.now()
                self.metricTrig_startPose = currentPose
                self.metricTrig_wasAutonomousAtRisingEdge = wasAutonomous
                self.metricTrig_startCheckingForValidity = True
                self.metricTrig_snapshotValid = wasAutonomous
            else:                           # Falling edge.
                if self.metricTrig_snapshotValid:
                    writeSnapshot = wasAutonomous             # Only true if there was a trigger and the av was autonomous at the rising edge of the trigger.
                    self.metricTrigTimer = (rospy.Time.now() - self.metricTrig_startTime).to_sec()
                    dist = np.sqrt((self.metricTrig_startPose.pose.position.x - currentPose.pose.position.x)**2 +
                                    (self.metricTrig_startPose.pose.position.y - currentPose.pose.position.y)**2)
                    
                    # Sometimes av can get disengaged while an metricTrig is still active. If av is engaged for the entire time of
                    # the duration of the metricTrig, or if wasAutonomous (which is false if av is engaged for anything less than 2 sec),
                    # is true for the entire time of the metricTrig, only then the metricTrig is recorded in the snapshot.
                    if self.metricTrig_wasAutonomousAtRisingEdge:
                        detailsDict['prefixList'].append(str(self.metricName))
                        detailsDict['durationList'].append(self.metricTrigTimer)
                        detailsDict['startTimeList'].append(self.metricTrig_startTime)
                        detailsDict['distanceList'].append(dist)

                self.metricTrig_startTime = 0         # Reinitialize.
                self.metricTrig_startPose = None
                self.metricTrigTimer = 0
                self.metricTrig_wasAutonomousAtRisingEdge = False
                self.metricTrig_startCheckingForValidity = False
                self.metricTrig_snapshotValid = False
                
        return writeSnapshot, detailsDict


class AV_METRICS_CLASS:
    def __init__(self):
        
        # AV Performance Metrics Triggers
        self.perfMetrics = []
        for trigger in ['ttc_comfort', 'no_collision']:
            self.perfMetrics.append(METRIC(trigger))

        
        # AV Health Metrics Triggers
        self.healthMetrics = []
        for trigger in ['H-WM-Fusion', 'H-WM-TLR', 'H-WM-Virtual', 'H-WM-WOS', 'H-Plan-TrajP', 'H-Plan-TrajC']:
            self.healthMetrics.append(METRIC(trigger))


        # Initialize bool_metrics_dict with all metrics set to default values
        self.BOOL_METRICS_DEFAULTS = {
            "ttc_comfort": True,
            "thw_comfort": True,
            "risky_maneuver_comfort": True,
            "no_collision": True,
            "no_close_pedestrian": True,
            "drivable_area_compliance": True,
            "comfort": True,
            "no_unnecessary_wait": True,
            "reached_destination": True,
            "no_fail": True
        }


    def anyTriggersStillActive(self):
        return any(metric_obj.metricTrig for metric_obj in self.perfMetrics + self.healthMetrics)
    
    
    def parse_metrics_data(self, data_str):
        """
        Parse metrics data string and update bool_metrics_defaults dictionary if keys match.

        Args:
            data_str (str): String containing metric data in comma separated key:value format

        Returns:
            dict: Updated bool_metrics_defaults dictionary
        """

        # Create a copy of the original dictionary to avoid modifying the original
        updated_metrics = self.BOOL_METRICS_DEFAULTS.copy()

        if isinstance(data_str, str):
            # Split the data string by commas to get key:value pairs
            metrics_pairs = data_str.strip().split(',')

            # Create a dictionary from the parsed data
            metrics_dict = {}
            for pair in metrics_pairs:
                if ':' in pair:
                    key, value = pair.strip().split(':', 1)
                    metrics_dict[key] = value

            # Check if any keys in the data match the keys in BOOL_METRICS_DEFAULTS
            # Directly matching keys (if any)
            for key in self.BOOL_METRICS_DEFAULTS:
                if key in metrics_dict:
                    # Convert string value to boolean
                    if metrics_dict[key].lower() == 'true':
                        updated_metrics[key] = True
                    elif metrics_dict[key].lower() == 'false':
                        updated_metrics[key] = False

            # Parse and include any health ("H-") metrics into updated_metrics
            for key, value in metrics_dict.items():
                if key.startswith('H-'):
                    v = value.strip()
                    try:
                        v_num = int(v)
                    except ValueError:
                        v_num = v
                    updated_metrics[key] = v_num

        return updated_metrics


    def process_av_metric_trigger(self, metrics_dict, metric_obj):
        if metric_obj.metricName in metrics_dict:
            if metrics_dict[metric_obj.metricName] is False:
                metric_obj.metricTrig = True
                metric_obj.metricTrig_waitForTimerCallback = True
            else:
                if not metric_obj.metricTrig_waitForTimerCallback:
                    metric_obj.metricTrig = False


    def process_health_metric_trigger(self, metrics_dict, metric_obj):
        if metric_obj.metricName in metrics_dict:
            current_value = metrics_dict[metric_obj.metricName]
            if metric_obj.prev_metricValue is not None:
                if current_value < metric_obj.prev_metricValue:  # Running to Stopped (goes from 3->2->0)
                    metric_obj.metricTrig = True
                    metric_obj.metricTrig_waitForTimerCallback = True
                elif current_value == 0:  # Stopped
                    if not metric_obj.metricTrig_waitForTimerCallback:
                        metric_obj.metricTrig = False
            metric_obj.prev_metricValue = current_value


    def metricsCallback(self, data):

        # Parse the data string and update the metrics dictionary
        metrics_dict = self.parse_metrics_data(data.data)

        # Handle AV Metrics triggers
        for metric_obj in self.perfMetrics:
            self.process_av_metric_trigger(metrics_dict, metric_obj)

        # Handle Health triggers (services/nodes going down)
        for metric_obj in self.healthMetrics:
            self.process_health_metric_trigger(metrics_dict, metric_obj)





















































