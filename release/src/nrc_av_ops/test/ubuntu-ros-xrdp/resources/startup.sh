#!/bin/bash

USER="admin"

apt update && apt upgrade -y && apt autoremove -y && apt autoclean

#### ---------------------------- Start SSH ---------------------------- ####
echo ""
service ssh start
#### ------------------------------------------------------------------- ####

#### --------------------------- Add Ros Env --------------------------- ####
echo ""
isRosInFile=$(grep -c "/opt/ros/noetic/setup.bash" /home/$USER/.bashrc)
if [ "$isRosInFile" -eq 0 ]; then
    echo "source /opt/ros/noetic/setup.bash" >>/home/$USER/.bashrc
fi
#### ------------------------------------------------------------------- ####

#### ------------------------- Clone/Pull code ------------------------- ####
echo ""
ws_dir=/home/$USER/projects/nrc_ws
if [ ! -d $ws_dir ]; then
    mkdir -p $ws_dir/src
    mkdir -p /home/$USER/.ssh
    cd $ws_dir/src || exit
    cp -r /root/.ssh/id_rsa* /home/$USER/.ssh
    chmod 400 /home/$USER/.ssh/id_rsa
    GIT_SSH_COMMAND="ssh -i /home/$USER/.ssh/id_rsa -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" git clone ssh://git@stash.ail-sv.com/nrc/nrc_av_ui.git -b feature/FY22_SV_Dev
    GIT_SSH_COMMAND="ssh -i /home/$USER/.ssh/id_rsa -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" git clone ssh://git@stash.ail-sv.com/nrc/nrc_msgs.git -b feature/FY22_SV_Dev
else
    cd $ws_dir/src/nrc_av_ui || exit
    GIT_SSH_COMMAND="ssh -i /home/$USER/.ssh/id_rsa -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" git pull --progress --no-rebase --tags --prune origin
    cd $ws_dir/src/nrc_msgs || exit
    GIT_SSH_COMMAND="ssh -i /home/$USER/.ssh/id_rsa -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" git pull --progress --no-rebase --tags --prune origin
fi
#### ------------------------------------------------------------------- ####

#### ------------------------- Build Workspace ------------------------- ####
echo ""
chown -R $USER /home/$USER/projects
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make"
su - $USER -c "source /opt/ros/noetic/setup.bash && cd /home/$USER/projects/nrc_ws && catkin_make install"
#### ------------------------------------------------------------------- ####
