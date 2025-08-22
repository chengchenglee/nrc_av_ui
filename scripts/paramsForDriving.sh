#!/bin/bash

# Grab the vehicle_type or set a default ...
if [ $# -gt 0 ]; then
 vehicle_type=$1
 #echo using map_name $map_name
 # To see the map names we recognize, look below ...
 #
 # TODO: a much better way to populate a menu is to add a feature to the metric map manager
 # to query the correct ROS params and map options - after all, the Manager KNOWS what it is looking for
 #
else
 vehicle_type=Leaf
 #map_name=MiniMap
 #echo using default map name $map_name
fi

cd ~/projects/nrc_ws/src/nrc_av_ui/scripts
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

LeafParams() {
    echo "6) Setting leaf params"
    rosparam set /vehicleParameters/wheelBase 2.7
    rosparam set /vehicleParameters/steerRatio 18.3
}

AriyaParams() {
    echo "6) Setting ariya params"
    rosparam set /vehicleParameters/wheelBase 2.7
    rosparam set /vehicleParameters/steerRatio 14.0
}

main() {
# pick one
if   [ $vehicle_type == "Leaf" ];   then LeafParams;
elif [ $vehicle_type == "Ariya" ];  then AriyaParams;
else                                     LeafParams;
fi
}

main;
echo "Done setting driving params."

# roslaunch nrc_wm_svcs world_object_store_parameters.launch

