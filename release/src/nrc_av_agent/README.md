## **🏗️ Development**

### Technologies

- [ElectronJS v23](https://www.electronjs.org/)
- [Socket.IO v4](https://socket.io/)
- [ReactJS v18](https://reactjs.org/)
- [Ant Design v5](https://ant.design/)
- [ViteJS v4](https://vitejs.dev/)
- [Typescript v4.9](https://www.typescriptlang.org/docs/)

### Installation

```bash
yarn ci
```

### Upgrade dependencies

```bash
yarn upgrade:dependencies
yarn install
```

### Running the app

```bash
# development - watch mode
yarn start
```

### Linter

```bash
# check for linter issues
yarn lint:check

# check and fix linter issues
yarn lint
```

### Formatter

```bash
# check for formatter issues
yarn format:check

# check and fix formatter issues
yarn format
```

### Build and package:

```bash
# For Linux
yarn make:linux

# For Windows
yarn make:win

# For MacOS
yarn make:mac
```

---

## **🎯 Deployment**

### **I. Deploy Agent to Nissan Vehicle's computer**

To deploy the Nissan AV Agent on a vehicle's computer, follow these steps:

> **Step 1**: Copy file <ins>"_Nissan_AV_Agent-**\<version\>**.AppImage_"</ins> into anywhere you want
>
> **Step 2**: chmod +x <ins>"_Nissan_AV_Agent-**\<version\>**.AppImage_"</ins>
>
> **Step 3**: To start the Agent, following command:

```
./Nissan_AV_Agent-**\<version\>**.AppImage
```

> **Step 4**: After the form to register the car shows up, enter the required information.
>
> **Step 5**: The Agent will generate a unique certKey and send all information to the backend for vehicle registration

### **II. Setting up ROS Nodes on a Car**

> **Step 1: Install ROS Melodic on Ubuntu 18.04**
> To install ROS Melodic on Ubuntu 18.04, follow the installation instructions provided on the ROS Wiki page [here](http://wiki.ros.org/melodic/Installation/Ubuntu)
>
> **Step 2: Verify ROS Environment Setup**
> After successfully installing ROS Melodic, verify that the ROS environment has been properly set up by running the following command:
>
> ```bash
> printenv | grep ROS
> ```
>
> If the ROS install successfully, results is:
>
> ```bash
> ROS_ETC_DIR=/opt/ros/melodic/etc/ros
> ROS_ROOT=/opt/ros/melodic/share/ros
> ROS_MASTER_URI=http://localhost:11311
> ROS_VERSION=1
> ROS_PYTHON_VERSION=2
> ROS_PACKAGE_PATH=/opt/ros/melodic/share
> ROSLISP_PACKAGE_DIRECTORIES=
> ROS_DISTRO=melodic
> ```
>
> **Step 3: Create a New Workspace**
> Create a new workspace for the project by running the following command:
>
> ```
> mkdir -p ~/projects/nrc_ws/src
> ```
>
> **Step 4: Clone Projects nrc_msgs to Workspace and build**
> The first clone the **nrc_msgs** projects to the newly created workspace. Build the project by navigating to the workspace directory with the following commands:
>
> ```
> cd ~/projects/nrc_ws/
> catkin_make
> catkin_make install
> ```
>
> **Step 5: Clone Projects nrc_av_ui to Workspace and build**
> After **nrc_msgs** build finished clone the **nrc_av_ui** projects to the **nrc_ws** and follow commands **Step 4**.
