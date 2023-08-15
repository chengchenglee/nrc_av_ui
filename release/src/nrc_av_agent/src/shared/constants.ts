export enum InterfaceFileStatusType {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}

export enum CommandsStatusType {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}

export enum MachineStatusType {
  PASS = 'PASS',
  FAIL = 'FAIL'
}

export enum RosTopicStatusType {
  GOOD = 'GOOD',
  BAD = 'BAD',
  TERRIBLE = 'TERRIBLE'
}

export interface InterfaceFile {
  pID?: string;
  fileName: string;
}

export enum EnumStatusRunAllCommands {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE'
}

export interface Command {
  id: number;
  command: string;
  name: string;
  pid: number;
}

export interface CommandsStatus extends Command {
  status: string;
}

export interface Machine {
  name: string;
  addr: string;
}

export interface Sensor {
  name: string;
  errRate: number;
  warnRate: number;
  topicName: string;
  topicType: string;
}

export interface Algorithm {
  name: string;
  errRate: number;
  warnRate: number;
  topicName: string;
  topicType: string;
}

export interface MachinesStatus extends Machine {
  status: MachineStatusType;
}

export interface SensorsStatus extends Sensor {
  status: RosTopicStatusType;
}

export interface SensorsTopic extends SensorsStatus {
  lastMsgStamp: number;
  lastGlobalStamp: number;
  avgDowntimeInit: number;
}

export interface AlgorithmsStatus extends Algorithm {
  status: RosTopicStatusType;
}

export interface AlgorithmsTopic extends AlgorithmsStatus {
  lastMsgStamp: number;
  lastGlobalStamp: number;
  avgDowntimeInit: number;
}

interface IErrorResponse {
  status: 'error';
  message: any;
}

interface ISuccessResponse {
  status: 'success';
  data?: any;
  pid?: any;
}

export interface IErrorCommand {
  idCommand: number;
  error: any;
}

export type IResponse = IErrorResponse | ISuccessResponse;

export enum EnumVehicleStatusState {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  FETCHING = 'FETCHING',
  ROS_BRIDGE_INIT = 'ROS_BRIDGE_INIT',
  ROS_CONNECTION_INIT = 'ROS_CONNECTION_INIT'
}

export enum EnumVehicleConnectionState {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE'
}

export const sharedState = {
  initialVehicleStatusState: EnumVehicleStatusState.WAITING
};

export interface Interface {
  name: string;
  mapName: string;
  machines: Machine[];
  sensors: Sensor[];
  algorithms: Algorithm[];
}

export interface AgentMap {
  mapName: string;
}

export interface InterfaceStatus {
  interfaceName: string;
  machines: MachinesStatus[];
  sensors: SensorsStatus[];
  algorithms: AlgorithmsStatus[];
  status?: InterfaceFileStatusType;
  statusRunAll: EnumStatusRunAllCommands;
  statusCommands: CommandsStatus[];
  anyStatusUpdate: boolean;
}

export interface InterfaceFiles {
  interfaces: Interface[];
}

export const ROS_BRIDGE_SOCKET = {
  SOCKET_PORT: 9090,
  SOCKET_URL: 'ws://127.0.0.1'
};

export interface ROSBridgeHealthcheckData {
  socketPort: number;
  socketUrl: string;
}

export const ROS_BRIDGE_WORKER_HEALTHCHECK = {
  ROS_BRIDGE_PING_RETRY: 5,
  ROS_BRIDGE_PING_BUFFER_TIME: 2500,
  ROS_BRIDGE_PING_TIMEOUT: 2500,
  ROS_BRIDGE_PING_INTERVAL: 2500
};
