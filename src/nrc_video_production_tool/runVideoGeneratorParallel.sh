#! /bin/bash

# Path for different directories
venvDir="$HOME/projects/awsVideoProduction/venv"
source /opt/ros/noetic/setup.bash
source $venvDir/bin/activate
pyCodeDir="$HOME/projects/nrc_ws/src/nrc_av_ui/src/nrc_video_production_tool"
snapshotsDir="/opt/data/snapshots/"
nfsServerParentDir="/space"
nfsDir="/space/nfsserver/snapshot_data_do_not_delete/foxtrot_snapshots" #Not used anymore, keeping it just in case

## declare an array variable
declare -a agent_array=("Foxtrot/" "AV_MIKE/")
declare -a nfs_dir_array=("/space/nfsserver/snapshot_data_do_not_delete/foxtrot_snapshots" "/space/nfsserver/snapshot_data_do_not_delete/mike_snapshots")

# get length of an array
arraylength=${#agent_array[@]}

# use for loop to read all values and indexes
for (( i=0; i<${arraylength}; i++ ));
do
    echo "index: $i, value: ${agent_array[$i]}"
    #If given a particular input snapshot collected date, then use that instead of current date
    inputDate=$1
    if [ -z "$inputDate" ]
    then
        directoryToProcess=$snapshotsDir${agent_array[$i]}$(date '+%Y-%m-%d')
    else
        if [[ $1 == *"${agent_array[$i]}"* ]]; then
            echo "String contains substring"
            directoryToProcess=$1
        else
            echo "String does not contain substring"
            continue
        fi
    fi 

    #Check if snapshots are in the files
    if test -d $directoryToProcess; then
        echo "$directoryToProcess exists"
        if [ -z "$( ls -A "$directoryToProcess")" ]; then
            echo "$directoryToProcess is empty continuing to next folder"
        else
            echo "$directoryToProcess is not empty"
            #Compress bag files function definition to be run in parallel
            decompressFiles() {
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
            export -f decompressFiles
            
            #Run decompression of bag files in parallel
            parallel -u decompressFiles ::: $directoryToProcess/*.bag

            #Move all the compressed original files to compressed/ folder
            echo "Done compressing bag files, moving all compressed files to compressed/ folder"
            shopt -s nullglob
            mkdir $directoryToProcess/compressed
            mv $directoryToProcess/*.orig.bag $directoryToProcess/compressed
            
            #Compress the folder with all the compressed files instead of keeping the folder itself
            tar -zcvf  $directoryToProcess/compressed.tar.gz -C $directoryToProcess/compressed .
            
            #Delete the compressed bag file folder after compressing the folder
            rm -r $directoryToProcess/compressed

            #Video generator function definition to be run in parallel
            runVideoGenerator(){
                pyCodeDir="$HOME/projects/nrc_ws/src/nrc_av_ui/src/nrc_video_production_tool"
                dir=${1}
                echo "Running video generator for $dir"
                /home/users/sachin/projects/awsVideoProduction/venv/bin/python3.8  $pyCodeDir/generateVideo.py $dir
            }
            
            cd $pyCodeDir
            echo "cd $pyCodeDir"
            echo "Video generator"
            export -f runVideoGenerator
            
            #Run video generator of bag files in parallel
            parallel -u runVideoGenerator ::: $directoryToProcess/*.bag
            
            #Check if nfs is mounted, if not mount it before copying the files
            if test -d ${nfs_dir_array[$i]}; then
                echo "${nfs_dir_array[$i]} exists"
                #cp -r $directoryToProcess ${nfs_dir_array[$i]}
                rsync -av --progress $directoryToProcess ${nfs_dir_array[$i]}
            else
                #Mount nfsserver to /space/nfsserver
                cd $nfsServerParentDir
                echo $pwd
                sudo mount -t nfs 192.168.29.10:/AV_DATA nfsserver
                echo "Successfully mounted nfsserver"
                #cp -r $directoryToProcess ${nfs_dir_array[$i]}
                rsync -av --progress $directoryToProcess ${nfs_dir_array[$i]}
            fi
        fi
    else
        echo "$directoryToProcess does not exist"
    fi
    
    ################################################
#     if [ -z "$inputDate" ]
#     then
#         directoryToProcess=$snapshotsDir${agent_array[$i]}$(date '+%Y-%m-%d')
#     else
#         directoryToProcess=$1
#     fi
# 
#     echo "$directoryToProcess"
#     echo "${nfs_dir_array[$i]}"
done
