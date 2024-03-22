export enum VehicleStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  OFFLINE = 'OFFLINE'
}

export enum AgentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum SubSystemType {
  SENSOR = 'Sensor',
  ALGORITHM = 'Algorithm'
}

export enum SocketEnum {
  ROOM_PREFIX = 'nissan/'
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export enum SocketEventEnum {
  REGISTRATION_REQUEST = 'nissan/vehicle/registration-request',
  VEHICLE_REGISTRATION = 'nissan/vehicle/registration',
  VEHICLE_UPDATION = 'nissan/vehicle/updation',
  VEHICLE_RESET_CERTKEY = 'nissan/vehicle/certkey-reset',
  REGISTRATION_RESPONSE = 'nissan/vehicle/registration-response',
  VEHICLE_STATUS = 'nissan/vehicle/status',
  GET_INTERFACE_DETAIL_STATUS = 'nissan/vehicle/interface/detail/status',

  RUN_INTERFACE = 'nissan/interface/run',
  STOP_INTERFACE = 'nissan/interface/stop',
  SEND_SUBSYSTEM = 'nissan/interface/send/sub-system',
  RUN_ALL_INTERFACE_SUBSYSTEM = 'nissan/interface/exec-all/sub-system',
  RUN_SUBSYSTEM = 'nissan/interface/exec/sub-system',
  STOP_SUBSYSTEM = 'nissan/interface/stop/sub-system',

  RUN_INTERFACE_COMMAND = 'nissan/interface/exec/command',
  STOP_INTERFACE_COMMAND = 'nissan/interface/stop/command',
  RUN_ALL_INTERFACE_COMMANDS = 'nissan/interface/exec-all/command',
  CHANGE_MAP = 'nissan/interface/changemap'
}

export enum EventEmitterNameSpace {
  VEHICLE_STATUS = 'vehicle.status',
  VEHICLE_INTERFACE_DETAIL_STATUS = 'vehicle.interface.detail.status',
  VEHICLE_DISCONNECT = 'vehicle.disconnect'
}

export enum Alias {
  INTERFACE = 'interface',
  SUBSYSTEM = 'subSystem',
  DEPEND_SUBSYSTEM = 'dependSystems',
  MACHINES = 'machines',
  TOPIC = 'topics',
  COMMANDS = 'commands',
  MULTI_DESTINATIONS = 'multiDestinations',
  INTERFACE_DESTINATIONS = 'interfaceDestinations',
  DESTINATIONS = 'destinations',
  DESTINATION = 'destination',
  USER = 'user',
  NODES = 'nodes',
  ROLE = 'role'
}

export enum PermissionEnum {
  READ_STATUS = 'read_status',
  ALLOW_NEW_VEHICLE = 'allow_new_vehicle',
  CREATE_INTERFACE = 'create_interface',
  UPDATE_INTERFACE = 'update_interface',
  READ_INTERFACE = 'read_interface',
  DELETE_INTERFACE = 'delete_interface',
  RUN_INTERFACE = 'run_interface',
  RUN_SUBSYSTEM = 'run_subsystem',
  CREATE_USER = 'create_user',
  READ_USERS = 'read_users',
  READ_ROLES = 'read_roles',
  READ_PERMISSIONS = 'read_permissions',
  DELETE_USER = 'delete_user',
  UPDATE_USER = 'update_user',
  DELETE_ROLES = 'delete_roles',
  UPDATE_ROLES = 'update_roles',
  CREATE_ROLES = 'create_roles',
  UPDATE_PERMISSIONS = 'update_permissions',
  DELETE_PERMISSIONS = 'delete_permissions',
  CREATE_PERMISSIONS = 'create_permissions'
}
