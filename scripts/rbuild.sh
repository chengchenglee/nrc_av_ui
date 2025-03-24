#!/bin/bash

echo "Running rbuild script"

cd ~/projects/nrc_ws
if [[ $# -eq 1 ]] ; then
  catkin_make -j 8 --pkg $1
else
  catkin_make -j 8
fi
