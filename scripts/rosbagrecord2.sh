#! /bin/bash

NRC_BAG_DIR=/opt/data/rosbag

COMP=""
DUR=3m
SIZ=1024
NAME="default"

while getopts p:c:d:s:o:e: flag
do
  case "${flag}" in
    p) NRC_BAG_DIR=${OPTARG};;
    c) COMP=${OPTARG};;
    d) DUR=${OPTARG};;
    s) SIZ=${OPTARG};;
    o) NAME=${OPTARG};;
    e) TOP=${OPTARG};;
  esac
done
    
echo "Bagfile record options (name/compression/duration): " $NAME $COMP $DUR
    
d=`date +%F`
cd ${NRC_BAG_DIR}
mkdir -p ${d}
cd ${d}

echo "Recording to directory: " $PWD
rosbag record -o $NAME -e $TOP $COMP --split --duration=$DUR --buffsize=$SIZ
