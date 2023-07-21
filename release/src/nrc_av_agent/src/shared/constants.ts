export enum ROSNodeStatusType {
  NOT_STARTED = 'NOT_STARTED',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  UNKNOWN = 'UNKNOWN'
}

export enum InterfaceFileStatusType {
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
export interface ROSNode {
  packageName?: string;
  name: string;
}
export interface ROSLaunchFile {
  packageName: string;
  launchName: string;
}
export interface ROSNodeStatus extends ROSNode {
  status: ROSNodeStatusType;
}

export interface InterfaceFile {
  pID?: string;
  fileName: string;
}

export enum EnumStatusRunAllCommands {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE'
}

export interface InterfaceFileStatus extends InterfaceFile {
  status: InterfaceFileStatusType;
  statusRunAll: EnumStatusRunAllCommands;
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

export interface AgentInterface {
  name: string;
  mapName: string;
  machines: Machine[];
  sensors: Sensor[];
  algorithms: Algorithm[];
}

export interface Interface {
  mapName: string;
  agentInterface: AgentInterface;
}

export interface AgentMap {
  mapName: string;
}

export interface InterfaceCommand {
  id: number;
  command: string;
}
export interface InterfaceStatus {
  interfaceName: string;
  machines: MachinesStatus[];
  sensors: SensorsStatus[];
  algorithms: AlgorithmsStatus[];
  status?: InterfaceFileStatusType;
}

export interface InterfaceFiles {
  interfaces: Interface[];
}

export interface ROSNodeArr {
  nodeArr: ROSNode[];
}
