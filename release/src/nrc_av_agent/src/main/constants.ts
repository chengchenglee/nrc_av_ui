export const COMMUNICATION = {
  TIME_OUT: 10000, // ms
  RUN_ROS_TIME_OUT: 4000
};
export const SOCKET = {
  NAME_SPACE: 'nissan'
};
export const APP_CONFIG_FOLDER_NAME = 'app-config';
export const APP_CONFIG = {
  VEHICLE: 'vehicle-info',
  CONNECTION: 'connection'
};

export const ROS = {
  NOT_EXIST: 'not exist',
  ROS_CORE_NOT_START: 'ROS core not start',
  ROS_NODES_NOT_START: 'ROS nodes not start',
  SUCCESS: 'success'
};

export const ROS_COMMAND = {
  PING_NODE: 'rosnode ping -c 1', // options -c 1 is COUNT number of pings to send
  GET_LIST_ROS_PACK: 'rospack list | grep'
};
