#! /bin/bash

venvDir="$HOME/projects/awsVideoProduction/venv"
source /opt/ros/noetic/setup.bash
source $venvDir/bin/activate
snapshotsDir="/opt/data/snapshots/Foxtrot/"
inputDate=$1
if [ -z "$inputDate" ]
then
    directoryToProcess=$snapshotsDir$(date '+%Y-%m-%d')
else
    directoryToProcess=$1
fi

echo $directoryToProcess
# define it
# run it
# test_dir="/space/data/snapshot_test"
# myls $test_dir

compressFiles() {
    rosbag_info() {
        rosbag info $1 | grep compression
    }
    dir=${1}
    string=$(rosbag_info $dir)
    if [[ $string == *"none"* ]]; then
        echo "No compression need for bag $dir"
    else
        echo "Decompressing $dir"
        rosbag decompress $dir
    fi
}

echo "Bag file decompression"
export -f compressFiles
parallel -u compressFiles ::: $directoryToProcess/*.bag

echo "Done compressing bag files, moving all compressed files to compressed/ folder"
shopt -s nullglob
mkdir $directoryToProcess/compressed
mv $directoryToProcess/*.orig.bag $directoryToProcess/compressed

runVideoGenerator(){
    pyCodeDir="$HOME/projects/nrc_ws/src/nrc_av_ui/src/nrc_video_production_tool"
    dir=${1}
    echo "Running video generator for $dir"
    /home/users/sachin/projects/awsVideoProduction/venv/bin/python3.8  $pyCodeDir/generateVideo.py $dir
}

echo "Video generator"
export -f runVideoGenerator
parallel -u runVideoGenerator ::: $directoryToProcess/*.bag
cp -r $directoryToProcess "/space/nfsserver/snapshot_data_do_not_delete/foxtrot_snapshots"
