#!/bin/bash

echo "Running bashrc_script in nrc_av_ui/scripts"
echo "Common commands: rbuild, startAv, startRemote, resetPlanner, shutdownMrcy, frontDisplay, mountNfs, runBatchValidation, makeResimVideo."

alias rbuild="~/projects/nrc_ws/src/nrc_av_ui/scripts/rbuild.sh"
alias startAv="python3 ~/projects/nrc_ws/src/nrc_av_ui/av_ui/av_ui.py"
alias startRemote="python3 ~/projects/nrc_ws/src/nrc_av_ui/av_ui/remoteMonitor.py"
alias resetPlanner="rostopic pub /ResetRalp std_msgs/Bool true"
alias shutdownMrcy="python ~/Desktop/shutdown_script.py"

rvizPath=~/projects/nrc_ws/src/nrc_ralp/nrc_ralp_svcs/config/
alias frontDisplay="rviz -d $rvizPath/FrontDisplay.rviz"
alias manualDisplay="rviz -d $rvizPath/FrontDisplayManual.rviz"

alias mountNfs="sudo mkdir -p /srv/nfs/avdata; sudo mount -t nfs 192.168.29.10:/AV_DATA /srv/nfs/avdata; echo \"NFS Mounted /srv/nfs/avdata\""
alias runBatchValidation="~/projects/nrc_ws/src/nrc_sim/src/simpleator/sim_base/score_bagfiles_parallel.sh /srv/nfs/avdata/snapshot_data_do_not_delete/curated_snapshots/Mike 4 0 resim 0 Mike"

# runBatchValidation () { 
# Usage: runBatchValidation Foxtrot  (Note: default platform name is Mike)
#   local current_dir=$(pwd)
#   roscd nrc_sim/src/simpleator/sim_base/
#   local platform=${1:-"Mike"}
#   echo "review simulation results in ~/projects/nrc_ws/src/nrc_sim/simResults/$platform"
#   ./score_bagfiles_parallel.sh /srv/nfs/avdata/snapshot_data_do_not_delete/curated_snapshots/$platform 4 0 resim 1 $platform 
#   cd $current_dir
# }

# makeResimVideo () { 
# # Usage: makeResimVideo ~/Desktop/20250523_122359 (Note: default values is '.')
#   local current_dir=$(pwd)
#   roscd nrc_av_ui/src/nrc_video_production_tool
#   local resim_video_folder=${1:-"$HOME/projects/nrc_ws/src/nrc_sim/simResults"}
#   echo "Note: This command only works assuming all the *_resim.bag files are stored in '~/projects/nrc_ws/src/nrc_sim/simResults' folder."
#   echo "Review re-simulation videos in '$resim_video_folder/resim_videos'."
#   error_output=$(./video_gen_batch.sh $resim_video_folder 2> >(tee /dev/stderr) >/dev/null)
# #   Check for the specific error message
#   if echo $error_output | grep -q "No such file or directory"; then
#     echo "In case of error, see instructions listed in '~/projects/nrc_ws/src/nrc_av_ui/src/nrc_video_production_tool/ReadMe.md'."
#   fi
#   cd $current_dir
# }

# # start up shortcuts
# alias gpsCheck="rostopic echo /dynamic_global_pose_conv | grep status_"
# alias checkGps="rostopic echo /dynamic_global_pose_conv | grep status_"
# alias checkNtrip="ping 192.168.65.50"
# alias checkKitt="ping 192.168.65.50"
# alias checkAmigo="ping 192.168.25.41"
# alias recordBagfile="roslaunch nrc_svcs record_separately.launch record_machine:=node02"
# alias setupTabs="~/projects/nrc_ws/src/nrc_svcs/scripts/setupTabs.sh"
# 
# avAgentPath=~/projects/nrc_ws/src/nrc_av_ui/release
# alias avAgent="$avAgentPath/Nissan_AV_Agent-0.6.0.AppImage"
# 
# # lane planner shortcuts
# alias go="rostopic pub /lane_planner_enable_fullLane std_msgs/Bool true"
# alias checkLanePlanner="rostopic echo /lane_planner_state | grep status_"
# 
# # decision making shortcuts
# alias allowPass="rostopic pub /intervention_response nrc_msgs/InterventionResponse '{response_type: 6}'"
# 
# #drive goal for java for Jan19 demo Intention indicator
# #alias dgjava='rostopic pub /drive_goals_with_lanes nrc_msgs/DriveGoalsWithLanes -l -f /home/leaf/demo_jan_2019/java_with_stop.yaml'
# 
# alias sendToAws='~/projects/nrc_ws/src/nrc_svcs/scripts/sendToAws.sh'
# 
# #ntrip shortcuts
# alias nuvoNtrip='~/projects/nrc_ws/src/nrc_hw/nrc_hw_svcs/scripts/ntripCommand-leaf.sh Serial NRC'
# alias mrcyNtrip='~/projects/nrc_ws/src/nrc_hw/nrc_hw_svcs/scripts/ntripCommand-leaf.sh USB NRC'
# 
# #Intelligent pedal shortcuts
# alias iplearningon="rostopic pub /useLearnedIPValues std_msgs/Bool -- true"
# alias iplearningoff="rostopic pub /useLearnedIPValues std_msgs/Bool -- false"
# alias reactiveon="rostopic pub /useReactiveForModes std_msgs/Bool -- true"
# alias reactiveoff="rostopic pub /useReactiveForModes std_msgs/Bool -- false"

echo "Done running bashrc_script in nrc_av_ui/scripts"
