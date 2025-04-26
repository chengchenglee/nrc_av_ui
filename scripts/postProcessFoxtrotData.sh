#!/bin/bash

echo "Beginning to post-process foxtrot data."

# source /opt/ros/noetic/setup.bash
# source ~/projects/externals_ws/devel/setup.bash
# source ~/projects/nrc_ws/devel/setup.bash
# source ~/projects/nrc_ws/src/nrc_av_ui/scripts/bashrc_script.sh

#temp="roscore"
#$temp

rosbagsFolder=/media/costafew/rosbag/foxtrot/2025-04-25_data_collection

cd $rosbagsFolder

#Commands
roscoreCmd="roscore"
rosParams="rosrun nrc_av_ui paramsForSim.sh"
rosMapCmd="rosrun nrc_av_ui paramsForMap.sh Franklin.set"

pcProcessor="roslaunch nrc_pcp_svcs pc_processor.launch dynamic_global_pose_topic_name:=/dynamic_global_pose do_road_surf_change_detection:=true include_road_surf_change_boundary_pts_for_drivable_area:=true Leaf_Foxtrot:=true publish_labeled_points:=true"
desired_topics=("lidar_raw" "cameras" "pc_processor" "system_main") 

for file in *; do
    # check if the file contains the string 'lidar_raw'
    if [[ "$basename "$file")" != *"lidar_raw"* ]]; then
        continue;
    fi
    echo "Found lidar_raw file: $file"

    rosbag_play_cmd="rosbag play --clock -r 0.5"

    # Extract the timestamp from the filename
    timestamp=$(basename "$file" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}')

    # Extract the seconds part of the timestamp
    seconds=$(echo "$timestamp" | awk -F'-' '{print $6}')    # Calculate the range of seconds to check (current second, one second before, and one second after)
    sec_minus_one=$(printf "%02d" $((seconds - 1)))
    sec_plus_one=$(printf "%02d" $((seconds + 1)))
    for sec in "$seconds" "$sec_minus_one" "$sec_plus_one"; do
        # Construct the new timestamp with the adjusted seconds
        new_timestamp=$(echo "$timestamp" | sed "s/-[0-9]\{2\}$/-$sec/")
        #echo "New timestamp: $new_timestamp"
        for fileAll in *; do
            match_found=false
            for topic in "${desired_topics[@]}"; do
                if [[ "$(basename "$fileAll")" == *"$topic"* ]]; then
                    match_found=true
                    break
                fi
            done
            if [[ "$match_found" == false ]]; then
                continue;
            fi

            if [[ "$basename "$fileAll")" != *"$new_timestamp"* ]]; then
                # echo "Not matching: $fileAll"
                continue;
            fi
            echo "Found matching file: $fileAll"
            rosbag_play_cmd="$rosbag_play_cmd $fileAll"
        done
    done
    echo $rosbag_play_cmd
    echo " "

    # Replay bagfiles
    $roscoreCmd &  
    sleep 5.0

    echo "\n\n-------------------------Running rosparams"
    $rosParams
    $rosMapCmd
    echo "\n\n-------------------------Successfully ran rosparams------------------------------------------------------------------"
    
    echo "\n\n-------------------------Running pc_processor"
    $pcProcessor &
    echo "\n\n-------------------------Successfully ran pc_processor------------------------------------------------------------------"
    sleep 5.0

    rvizCmd="rosrun rviz rviz -d `rospack find nrc_ralp_svcs`/config/Chris.rviz"        
    $rvizCmd &
    echo "\n\n-------------------------Successfully ran RViz------------------------------------------------------------------"
    sleep 3.0

    # Start rosbag, do not move to background
    $rosbag_play_cmd

    # Close all
    pkill -P $$
    wait

    break
done
