#!/bin/bash
echo "Running bashrc_script in nrc_svcs/scripts"
echo "Common commands: mrcyNtrip, recordBagfile, resetPlanner, shutdownMrcy, frontDisplay"

# start up shortcuts
alias gpsCheck="rostopic echo /dynamic_global_pose_conv | grep status_"
alias checkGps="rostopic echo /dynamic_global_pose_conv | grep status_"
alias checkNtrip="ping 192.168.65.50"
alias checkKitt="ping 192.168.65.50"
alias checkAmigo="ping 192.168.25.41"
alias recordBagfile="roslaunch nrc_svcs record_separately.launch record_machine:=node02"
alias setupTabs="~/projects/nrc_ws/src/nrc_svcs/scripts/setupTabs.sh"
alias shutdownMrcy="python ~/Desktop/shutdown_script.py"
alias rbuild="~/projects/nrc_ws/src/nrc_svcs/scripts/rbuild.sh"

rvizPath=~/projects/nrc_ws/src/nrc_ralp/nrc_ralp_svcs/config/
alias frontDisplay="rviz -d $rvizPath/FrontDisplay.rviz"
alias manualDisplay="rviz -d $rvizPath/FrontDisplayManual.rviz"
avAgentPath=~/projects/nrc_ws/src/nrc_av_ui/release
alias avAgent="$avAgentPath/Nissan_AV_Agent-0.6.0.AppImage"

# lane planner shortcuts
alias go="rostopic pub /lane_planner_enable_fullLane std_msgs/Bool true"
alias resetPlanner="rostopic pub /ResetRalp std_msgs/Bool true"
alias checkLanePlanner="rostopic echo /lane_planner_state | grep status_"

# decision making shortcuts
alias allowPass="rostopic pub /intervention_response nrc_msgs/InterventionResponse '{response_type: 6}'"

#drive goal for java for Jan19 demo Intention indicator
#alias dgjava='rostopic pub /drive_goals_with_lanes nrc_msgs/DriveGoalsWithLanes -l -f /home/leaf/demo_jan_2019/java_with_stop.yaml'

alias sendToAws='~/projects/nrc_ws/src/nrc_svcs/scripts/sendToAws.sh'

#ntrip shortcuts
alias nuvoNtrip='~/projects/nrc_ws/src/nrc_hw/nrc_hw_svcs/scripts/ntripCommand-leaf.sh Serial NRC'
alias mrcyNtrip='~/projects/nrc_ws/src/nrc_hw/nrc_hw_svcs/scripts/ntripCommand-leaf.sh USB NRC'

#Intelligent pedal shortcuts
alias iplearningon="rostopic pub /useLearnedIPValues std_msgs/Bool -- true"
alias iplearningoff="rostopic pub /useLearnedIPValues std_msgs/Bool -- false"
alias reactiveon="rostopic pub /useReactiveForModes std_msgs/Bool -- true"
alias reactiveoff="rostopic pub /useReactiveForModes std_msgs/Bool -- false"

echo "Done running bashrc_script in nrc_svcs/scripts"
