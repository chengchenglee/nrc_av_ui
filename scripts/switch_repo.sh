#!/bin/bash

if [ $# -eq 0 ]; then
    >&2 echo "No branch name provided, please pass branch name as argument, e.g. './switch_branch.sh ailsv_master'"
    exit 1
else
    branch=$1
fi

# some use another workspace name
WS=~/projects/nrc_ws/src

# use multiple short lists so easier to read
# maybe leave nrc_dummy out since it never branches?
R1="nrc nrc_cmake nrc_dummy nrc_msgs nrc_algo nrc_svcs nrc_av_ui"
R2="nrc_perc nrc_pcp nrc_ralp nrc_dm nrc_wm nrc_wm2"
R3="nrc_sim nrc_apps maav"
R4="nrc_leaf nrc_hw"
R5="rapid_ros_bridge rapid_ros_bridge_nrc"
R6="nrc_loc nrc_loc2"
R7="nrc_fmc/fmc_core nrc_fmc/fmc_RoutingMap nrc_fmc/maav_legacy"
R8="nrc_fmc/fmc_DrivePlanMap nrc_fmc/fmc_IntersectionMap nrc_fmc/FeatureMap"
R9="nrc_fmc/fmc_data_sanborn nrc_fmc/fmc_data_bootmap nrc_fmc/fmc_data_cached nrc_fmc/fmc_data_aisan"

REPOS="$R1 $R2 $R3 $R4 $R5 $R6 $R7 $R8 $R9";

for r in $REPOS; do
  # pull twice - if a new remote branch is created
  #  it can't be checked out until a pull has been done
  D=$WS/$r

  if [ -d $D ]; then
   cd $D
   echo
   echo Processing $r in workspace
   echo $(git pull)
   echo $(git checkout $branch)
   echo $(git pull)
   echo
  else
   echo Skip $r \($D not in workspace\)
  fi
done

exit 0; 

