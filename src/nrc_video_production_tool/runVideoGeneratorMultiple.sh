#! /bin/bash

inputDate=$1
if [ -z "$inputDate" ]
then
    dateNow=$snapshotsDir$(date '+%Y-%m-%d')
else
    dateNow=$1
fi

echo $dateNow

for dir in $dateNow/*; do
    echo "$dir"
    /home/users/sachin/projects/nrc_ws/src/nrc_av_ui/src/nrc_video_production_tool/runVideoGeneratorParallel.sh $dir
    #/home/users/sachin/projects/awsVideoProduction/venv/bin/python3.8  $pyCodeDir/generateVideo.py $dir
done
echo "Finished running video generator for all folders"
