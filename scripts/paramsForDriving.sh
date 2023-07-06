#!/bin/bash

echo
echo why am i being called from sim_interface.py when paramsForSim.sh exists?
echo also, map stuff has been moved to paramsForMap.sh
echo

cd ~/projects/nrc_ws/src/nrc_svcs/src/nrc_car_description
pwd=$(pwd) # so bashy

use_sim_time=False
VF_SOURCE_MODE='MODE_DYNAMIC_POSE'
VF_TOPIC='/dynamic_global_pose'
ROBOT_DESC="$pwd/leaf.urdf"

echo "Setting sim params:"
echo "1) use_sim_time $use_sim_time"
echo "2) /vehicleFeeder/sourceMode $VF_SOURCE_MODE"
echo "3) /vehicleFeeder/dynamicPoseTopicName $VF_TOPIC"
echo "4) /robot_description $ROBOT_DESC"
echo "5) launch world_object_store_parameter.launch"

echo $(rosparam set /use_sim_time $use_sim_time)
echo $(rosparam set /vehicleFeeder/sourceMode $VF_SOURCE_MODE)
echo $(rosparam set /vehicleFeeder/dynamicPoseTopicName $VF_TOPIC)
echo $(rosparam set /robot_description -t $ROBOT_DESC)

# roslaunch nrc_wm_svcs world_object_store_parameters.launch

