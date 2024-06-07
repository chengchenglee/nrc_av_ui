#! /bin/bash
if [ -z ${NRCSV_BAG_DIR+x} ]; then
  NRC_BAG_DIR=${HOME}/projects/disengagementData/;
fi
d=`date +%Y%m%d`
b="/bags"
cd ${NRC_BAG_DIR}
echo `date +%Y%m%d`
NRC_BAG_DIR+=$d

if [ -d ${NRC_BAG_DIR} ] 
then
    echo "Date directory ${NRC_BAG_DIR} exists." 
else
    echo "Creating directory ${NRC_BAG_DIR}"
    mkdir -p ${NRC_BAG_DIR}
fi

NRC_BAG_DIR+=$b

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
rosrun rosbag_snapshot snapshot --topic ${topics} -d 20 #Change 20s for something else for longer/shorter bag files

#echo ${topics}