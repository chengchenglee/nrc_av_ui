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

# Convert camera extrinsices from SV format to YM0 format
echo "Creating camera params files."

declare -a extrinsicsNames=(
  "~/projects/nrc_ws/src/nrc_perc/nrc_perc_svcs/config/camera/Leaf-Foxtrot/tower_cam_front_ext.txt,watec_front_wide"
  "~/projects/nrc_ws/src/nrc_perc/nrc_perc_svcs/config/camera/Leaf-Foxtrot/tower_cam_frontRight_ext.txt,watec_side_right"
  "~/projects/nrc_ws/src/nrc_perc/nrc_perc_svcs/config/camera/Leaf-Foxtrot/tower_cam_frontLeft_ext.txt,watec_side_left"
  "~/projects/nrc_ws/src/nrc_perc/nrc_perc_svcs/config/camera/Leaf-Foxtrot/tower_cam_backRight_ext.txt,watec_rear_right"
  "~/projects/nrc_ws/src/nrc_perc/nrc_perc_svcs/config/camera/Leaf-Foxtrot/tower_cam_backLeft_ext.txt,watec_rear_left"
  "~/projects/nrc_ws/src/nrc_perc/nrc_perc_svcs/config/camera/Leaf-Foxtrot/tower_cam_back_ext.txt,watec_front_tele"
)

# Create file
output_file="extrinsic_params.csv"
echo "sensor_name,x,y,z,yaw,pitch,roll,note" > $output_file
echo "luminar_front,0.9,-0.0045,1.758,-0.026,0.0, 0.0,2025.04.25 Chris" >> $output_file

# Get extrinsics
for entry in "${extrinsicsNames[@]}"; do
    IFS=, read -r filename sensorName <<< "$entry"    # Check if the file exists
    filename=$(eval echo $filename)
    echo $filename
    if [ ! -f "$filename" ]; then
        echo "File $filename not found!"
        continue
    fi
    
    # Extract parameters from the file
    x=$(grep "^x=" "$filename" | cut -d'=' -f2)
    y=$(grep "^y=" "$filename" | cut -d'=' -f2)
    z=$(grep "^z=" "$filename" | cut -d'=' -f2)
    yaw=$(grep "^yaw=" "$filename" | cut -d'=' -f2)
    pitch=$(grep "^pitch=" "$filename" | cut -d'=' -f2)
    roll=$(grep "^roll=" "$filename" | cut -d'=' -f2)    # Write the parameters to the output CSV file
    echo "$sensorName,$x,$y,$z,$yaw,$pitch,$roll,Collected from nrc_perc_svcs" >> $output_file
done

echo "Sensor extrinsics extraction complete. Output written to $output_file"

#Commands
roscoreCmd="roscore"
rosParams="rosrun nrc_av_ui paramsForDriving.sh"
rosMapCmd="rosrun nrc_av_ui paramsForMap.sh Franklin.set"
robotModelCmd="roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true"

pcProcessor="roslaunch nrc_pcp_svcs pc_processor.launch Leaf_Foxtrot:=true publish_labeled_points:=true"
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

    imagesBagname="images_$timestamp.bag"
    lidarBagname="lidar_$timestamp.bag"
    carBagname="basic_$timestamp.bag"
    objBagname="obj_$timestamp.bag"

    # Extract the seconds part of the timestamp
    # Calculate the range of seconds to check (current second, one second before, and one second after)
    seconds=$(echo "$timestamp" | awk -F'-' '{print $6}')
    sec_minus_one=$(printf "%02d" $((seconds - 1)))
    sec_plus_one=$(printf "%02d" $((seconds + 1)))
    for sec in "$seconds" "$sec_minus_one" "$sec_plus_one"; do
        # Construct the new timestamp with the adjusted seconds
        new_timestamp=$(echo "$timestamp" | sed "s/-[0-9]\{2\}$/-$sec/")
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
                continue;
            fi
            echo "Found matching file: $fileAll"
            rosbag_play_cmd="$rosbag_play_cmd $fileAll"
        done
    done

    # Remap topics to match YM0 expectation
    rosbag_play_cmd="$rosbag_play_cmd /pc_processor/multi_object_tracker/tracked_object_set:=/sensor_fusion/tracked_object_set \
                                      /tower_cam_front/image_rect_color/compressed:=/odet_cam_front_wide/image_raw/compressed \
                                      /tower_cam_frontLeft/image_rect_color/compressed:=/odet_cam_side_left/image_raw/compressed \
                                      /tower_cam_frontRight/image_rect_color/compressed:=/odet_cam_side_right/image_raw/compressed \
                                      /tower_cam_backLeft/image_rect_color/compressed:=/odet_cam_rear_left/image_raw/compressed \
                                      /tower_cam_backRight/image_rect_color/compressed:=/odet_cam_rear_right/image_raw/compressed \
                                      /tower_cam_back/image_rect_color/compressed:=/odet_cam_front_tele/image_raw/compressed
                                      /drivable_area_boundary_points:=dabp_old"

    echo $rosbag_play_cmd
    echo " "

    # Create target bagfile names
    imagesBagname="images_$timestamp.bag"
    lidarBagname="lidar_$timestamp.bag"
    carBagname="basic_$timestamp.bag"
    objBagname="obj_$timestamp.bag"

    imageBagRecordCmd="rosbag record -O $imagesBagname -e "/odet_cam\(.*\)""
    lidarBagRecordCmd="rosbag record -O $lidarBagname -e "/pc_processor/labeled_pc""
    carBagRecordCmd="rosbag record -O $carBagname -e "/dynamic_global_pose""
    objagRecordCmd="rosbag record -O $objBagname -e "/sensor_fusion/tracked_object_set""

    # Replay bagfiles
    $roscoreCmd &  
    sleep 5.0

    # Use time from rosbag play
    rosparam set /use_sim_time true
    sleep 1.0

    echo "\n\n-------------------------Running rosparams"
    $rosParams
    $rosMapCmd
    $robotModelCmd &
    echo "\n\n-------------------------Successfully ran rosparams------------------------------------------------------------------"
    
    echo "\n\n-------------------------Running pc_processor"
    $pcProcessor &
    echo "\n\n-------------------------Successfully ran pc_processor------------------------------------------------------------------"
    sleep 5.0

    rvizCmd="rosrun rviz rviz -d `rospack find nrc_ralp_svcs`/config/Chris.rviz"        
    $rvizCmd &
    echo "\n\n-------------------------Successfully ran RViz------------------------------------------------------------------"
    sleep 3.0

    # Start recordings
    $imageBagRecordCmd &
    $lidarBagRecordCmd &
    $carBagRecordCmd &
    $objagRecordCmd &
    sleep 3.0

    # Start rosbag, do not move to background
    $rosbag_play_cmd

    # Close all
    pkill -P $$
    wait

    break
done
