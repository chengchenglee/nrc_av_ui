#! /bin/bash

venvDir="$HOME/projects/awsVideoProduction/venv"
source /opt/ros/noetic/setup.bash
source $venvDir/bin/activate
awsBagsDir="$HOME/projects/awsVideoProduction/awsBags"
snapshotsDir="/opt/data/snapshots/Foxtrot/"
snapshotSaveDir="$HOME/projects/awsVideoProduction/awsBags/snapshot_bagfiles"
pyCodeDir="$HOME/projects/awsVideoProduction/venv/videoProductionTool"
test=false
vehicle="foxtrot"
inputDate=$1
if [ -z "$inputDate" ]
then
    dateNow=$snapshotsDir$(date '+%Y-%m-%d')
else
    dateNow=$1
fi

echo $dateNow
# 
# if [ "$test" = true ];
# then
#     awsCommand="aws s3 sync --profile sachin s3://rosbag-upload-test/snapshot_bagfiles/"$dateNow" $snapshotSaveDir/$dateNow/"
# else
#     awsCommand="aws s3 sync --profile sachin s3://$vehicle-snapshots/snapshot_bagfiles/$dateNow $snapshotSaveDir/$dateNow/"
# fi

#awsCommand="aws s3 ls --profile sachin s3://rosbag-upload-test/snapshot_bagfiles/20240510/"
#cd $awsBagsDir
#echo $awsCommand
#$awsCommand
#ls

echo "Decompressing all bags"
rosbag decompress $dateNow/*.bag
mkdir $dateNow/compressed
cd $dateNow
shopt -s nullglob
mv *.orig.bag $dateNow/compressed


cd $pyCodeDir
echo "cd $pyCodeDir"
echo "Starting Python node"
/home/users/sachin/projects/awsVideoProduction/venv/bin/python3.8  $pyCodeDir/generateVideo.py $dateNow
echo "Copying" $dateNow " to /space/nfsserver/snapshot_data_do_not_delete/foxtrot_snapshots"
cp -r $dateNow "/space/nfsserver/snapshot_data_do_not_delete/foxtrot_snapshots"
echo "Python node run finished"
