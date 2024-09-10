#! /bin/bash

rosbag_dir=$1
echo "$rosbag_dir"

shift
d=`date +%F`
cd ${HOME}/bagfiles
mkdir -p ${d}
cd ${d}
echo "Recording to directory: " $PWD
rosbag record "$@"
