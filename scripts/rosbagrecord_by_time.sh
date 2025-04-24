#!/bin/bash

NRC_BAG_DIR=$(rosparam get NRCSV_ROSBAG_RECORD_DIR)
if [ -z ${NRC_BAG_DIR+x} ]; then
  NRC_BAG_DIR=/opt/data/rosbag/
fi
echo "NRC_BAG_DIR is ${NRC_BAG_DIR}"

d=$(date +%F)
cd ${NRC_BAG_DIR}
mkdir -p ${d}
cd ${d}
echo "=================Recording to directory: " $PWD

rosbag record "$@" --split --duration=3m #--buffsize=1024
