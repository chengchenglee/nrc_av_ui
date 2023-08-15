FROM rattydave/docker-ubuntu-xrdp-mate-custom:20.04

RUN sudo apt update && sudo apt upgrade -y && sudo apt autoremove -y && sudo apt autoclean

#### ----------------- Install ROS ------------------ ####
RUN sudo sh -c 'echo "deb http://packages.ros.org/ros/ubuntu $(lsb_release -sc) main" > /etc/apt/sources.list.d/ros-latest.list'
RUN sudo apt install -y curl
RUN curl -s https://raw.githubusercontent.com/ros/rosdistro/master/ros.asc | sudo apt-key add -
RUN sudo apt update --fix-missing
RUN sudo apt install -y ros-noetic-desktop-full
RUN echo "source /opt/ros/noetic/setup.bash" >> ~/.bashrc
RUN sudo apt install -y python3-rosdep python3-rosinstall python3-rosinstall-generator python3-wstool build-essential
RUN sudo rosdep init
RUN rosdep update
#### ------------------------------------------------ ####

RUN sudo apt install -y nano openssh-server python-is-python3 iproute2 iputils-ping
RUN sudo apt install -y ros-noetic-rosbridge-server netcat

EXPOSE 3389 22
