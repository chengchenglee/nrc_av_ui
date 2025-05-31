# Video of Re_Simulation ROSbag files
## Introduction
This page explains how to set up a Python Virtual Environment to be able to install required package and libraries for a video generation tool that converts ROS bag files to videos using headless OpenCV. The Python Virtual Environment limits package installation to one folder and therefore, it prevents any undesired changes to the local host.

## Preparation
1) Pull on nrc_av_ui repository (feature/FY24_SV_Dev)

2) Install Python Virtual Environment with required libraries

## Instructions to create a Python Virtual Environment
- Create a folder for the virtual environment
```
mkdir $HOME/projects/VirEnv
cd $HOME/projects/VirEnv
```
- Install Python Virtual Environment
Note: Depending on the default Python on your machine, you may need to install a different version of Python Virtual Environment (e.g., sudo apt install python3.10-venv). 
```
sudo apt update
sudo apt install python3.8-venv
```

- Create Virtual Environment
Note: Make adjustments to the path as needed.
```
python3 -m venv $HOME/projects/VirEnv/
```

- Activate the newly created Virtual Environment
```
source bin/activate
```
Note: Make sure you see below (VirEnv) at the prompt of your terminal before you move to the next step.

## Install required Packages and Dependencies
- Install requirements
```
pip3 install -r $HOME/projects/nrc_ws/src/nrc_av_ui/src/nrc_video_production_tool/requirements.txt
```
Note : If you encounter errors, re-run this latest command. There should be messages like "Requirement
already satisfied" printed for all the packages listed in the "requirements.txt" file.

- Install required ROS package
```
sudo apt install ros-noetic-ros-numpy
```

- Change "point_cloud2.py" to fix Python error
```
sudo nano /opt/ros/noetic/lib/python3/dist-packages/ros_numpy/point_cloud2.py
```
Note: On line: 224, change from np.float -> np.float64

- Deactivate Virtual Environment
```
deactivate
```
## Run tool and create videos of re-sim bagfiles
3) Run Video Generation Tool

- Change directory to video generation tool folder
```
roscd nrc_av_ui/src/nrc_video_production_tool/
```

- Run video generation for multiple re-sim files in a folder
```
./video_gen_batch.sh <path/to/re_sim/video/storage_folder>
```
Example:
```
./video_gen_batch.sh $HOME/projects/nrc_ws/src/nrc_sim/simResults/Mike/resim_results/20250328_115415
```
Note:
1. This command only works assuming all the *_resim.bag files are stored in "$HOME/projects/nrc_ws/src/nrc_sim/simResults" folder.
2. It is required to provide a path for where the generated videos are stored.

- Run video generation tool for a single file
```
$HOME/projects/VirEnv/bin/python generateVideo.py <path/to/re-sim/bag> --output_directory <path/to/re-sim/video/storage>
```
Example:
```
$HOME/projects/VirEnv/bin/python generateVideo.py $HOME/projects/nrc_ws/src/nrc_sim/simResults/Mike/resim_results/20250328_115415/2024-12-09-15-33-40_snapshot/2024-12-09-15-33-40_snapshot_resim.bag --output_directory $HOME/projects/nrc_ws/src/nrc_sim/simResults/Mike/resim_results/20250328_115415/2024-12-09-15-33-40_snapshot/
```
