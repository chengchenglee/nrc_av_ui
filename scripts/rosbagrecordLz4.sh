#! /bin/bash
if [ -z ${NRCSV_BAG_DIR+x} ]; then
  NRC_BAG_DIR=/opt/data/rosbag;
fi
d=`date +%F`
cd ${NRC_BAG_DIR}
mkdir -p ${d}
cd ${d}
echo "Recording to directory: " $PWD
rosbag record "$@" --split --duration=3m --buffsize=1024 --lz4
