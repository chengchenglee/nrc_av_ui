#!/bin/bash
if [ -z "$1" ]; then
  echo "Error: Please provide a path (as an argument to this script) to store generated videos."
  exit 1
fi


echo "Storing videos in: $1"

find $HOME/projects/nrc_ws/src/nrc_sim/simResults -type f -name "*_resim.bag" -exec $HOME/projects/VirEnv/bin/python $HOME/projects/nrc_ws/src/nrc_av_ui/src/nrc_video_production_tool/generateVideo.py {} --output_directory $1 \;
