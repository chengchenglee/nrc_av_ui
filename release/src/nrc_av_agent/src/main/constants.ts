export const COMMUNICATION = {
  TIME_OUT: 110000, // 110s
  CERTKEY_NOT_FOUND: 'CertKey Not Found'
};
export const SOCKET = {
  NAME_SPACE: 'nissan'
};
export const APP_CONFIG_FOLDER_NAME = 'app-config';
export const APP_CONFIG_LOG_PRINTENV = 'log-env';
export const APP_CONFIG = {
  VEHICLE: 'vehicle-info',
  CONNECTION: 'connection',
  LOG: 'log',
  ROSBRIDGE: 'rosbridge'
};

export const ROS = {
  NOT_EXIST: 'not exist',
  ROS_CORE_NOT_START: 'ROS core not start',
  ROS_NODES_NOT_START: 'ROS nodes not start',
  SUCCESS: 'success'
};

export const INTERFACE_FILE = {
  INTERFACE_NOT_EXIST: 'Interface not exist',
  IS_RUNNING: 'already running',
  IS_NOT_RUNNING: 'is not running',
  STOP_SUCESSFULLY: 'stop successfully'
};

export const ROS_COMMAND = {
  PING_NODE: 'rosnode ping -c 1', // options -c 1 is COUNT number of pings to send
  GET_LIST_ROS_PACK: 'rospack list | grep',
  RUN_COMMAND_SUCCESS: 'Run command successfully',
  STOP_COMMAND_SUCCESS: 'Stop command successfully',
  RUN_ALL_COMMANDS_FAIL: 'Run all commands fail',
  RUN_COMMAND_FAIL: 'Run command fail',
  STOP_COMMAND_FAIL: 'Stop command fail',
  RUN_ALL_COMMMANDS_IS_RUNNING:
    'No map change while running. Shut things down before changing the map',
  CHANGE_MAP_SUCCESSFULLY: 'Change map successfully',
  CHANGE_MAP_FAILED: 'Change map failed'
};

export const SUB_SYSTEM = {
  SUBSYSTEM_NO_EXIST: 'Sub system do not exist',
  SET_SUBSYSTEM_SUCCESS: 'Set sub system successfully',
  RUN_SUBSYSTEM_SUCCESS: 'Run sub system successfully',
  RUN_SUBSYSTEM_FAIL: 'Run sub system fail',
  RUN_SUBSYSTEM_ALREADY_START: 'Sub system already started',
  STOP_SUBSYSTEM_SUCCESS: 'Stop sub system successfully',
  STOP_SUBSYSTEM_ALREADY_STOP: 'Sub system already stopped',
  DEFAULT_TIMEOUT: 30000,
  DEFAULT_LAUNCH_TIME: 200,
  DEFAULT_STOP_TIME: 5000
};

export const ROS_BRIDGE = {
  ROS_BRIDGE_SERVER_TIMEOUT: 10000,
  ROS_BRIDGE_SERVER_PING_RETRY: 15,
  ROS_BRIDGE_SERVER_PING_BUFFER_TIME: 2500,
  ROS_BRIDGE_SERVER_PING_TIMEOUT: 10000,
  ROS_BRIDGE_CONNECTION_TIMEOUT: 10000,
  ROS_BRIDGE_CONNECTION_RETRY: 15,
  ROS_BRIDGE_CONNECTION_BUFFER_TIME: 2000,
  ROS_BRIDGE_PASSIVE_PING_INTERVAL: 2000,
  ROS_BRIDGE_SERVER_INIT_RETRY: 5,
  ROS_BRIDGE_SERVER_INIT_BUFFER_TIME: 1000,
  ROS_BRIDGE_TOPIC_POLL_TIME: 1000,
  ROS_NODES_ARR: ['rosapi', 'rosbridge_websocket']
};

export const DIAGNOSTIC = {
  DIAGNOSTIC_RETRY: 5,
  DIAGNOSTIC_PASSIVE_INTERVAL: 2000,
  DIAGNOSTIC_COOLDOWN_INTERVAL: 30000
};
