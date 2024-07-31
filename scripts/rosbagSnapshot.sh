#! /bin/bash
#if [ -z ${NRCSV_BAG_DIR+x} ]; then
#  NRC_BAG_DIR=${HOME}/projects/disengagementData/;
#fi

# Setup root recording directory
NRC_BAG_DIR="${HOME}/projects/disengagementData/bags/"
if [ -d ${NRC_BAG_DIR} ]
then
  echo "Root snapshot directory $NRC_BAG_DIR exists."
else
  echo "Creating directory $NRC_BAG_DIR"
fi
cd $NRC_BAG_DIR

# Setup todays recording directory
#year=`date +%Y`
#month=`date +%m`
#day=`date +%d`
#d=$year"-"$month"-"$day
d=`date +%Y-%m-%d`
NRC_BAG_DIR+=$d

if [ -d ${NRC_BAG_DIR} ] 
then
    echo "Date directory ${NRC_BAG_DIR} exists." 
else
    echo "Creating directory ${NRC_BAG_DIR}"
    mkdir -p ${NRC_BAG_DIR}
fi

cd ${NRC_BAG_DIR}
echo "Disengagement/override to directory: " $PWD
topics=$(echo $@ | sed 's/|//g')
rosrun rosbag_snapshot snapshot --topic ${topics} -n -d 180 _compression:=LZ4 # Record maximum of 3 minutes of bagfile, real recording time dynamically updated
#echo ${topics}