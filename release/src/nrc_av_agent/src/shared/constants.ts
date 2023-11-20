type Modify<T, R> = Omit<T, keyof R> & R;

export enum InterfaceFileStatusType {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}

export enum CommandsStatusType {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}

export enum SubSystemStatusType {
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

export enum EnumTopicType {
  SENSOR = 'SENSOR',
  ALGORITHM = 'ALGORITHM'
}

export interface Command {
  id: number;
  command: string;
  name: string;
  pid?: number;
}

export interface CommandsStatus extends Command {
  status: string;
}

export interface Machine {
  name: string;
  addr: string;
}

export interface Sensor {
  id: number;
  name: string;
  healthCheckRate: number;
  errRate: number;
  warnRate: number;
  topicName: string;
  topicType: string;
}

export interface Algorithm {
  id: number;
  name: string;
  healthCheckRate: number;
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
  uuid: string;
  msgCount: number;
}

export interface SensorsTopic extends SensorsStatus {
  lastMsgStamp: number;
  lastGlobalStamp: number;
  avgDowntimeInit: number;
}

export interface AlgorithmsStatus extends Algorithm {
  status: RosTopicStatusType;
  uuid: string;
  msgCount: number;
}

export interface AlgorithmsTopic extends AlgorithmsStatus {
  lastMsgStamp: number;
  lastGlobalStamp: number;
  avgDowntimeInit: number;
}

export type TopicType = SensorsStatus | AlgorithmsStatus;

export enum SubSystemType {
  SENSOR = 'Sensor',
  ALGORITHM = 'Algorithm'
}

export interface CommandNodes {
  id: number;
  name: string;
}

export interface CommandSubSystem {
  id: number;
  name: string;
  command: string;
  nodes: CommandNodes[];
  inclByDef: boolean;
  autoStart: boolean;
  autoRecord: boolean;
  launchTime: number;
}

export interface TopicSubSystem {
  id: number;
  name: string;
  topicName: string;
  topicType: string;
  normalRate: number;
  errRate: number;
  warnRate: number;
}

export interface SubSystem {
  id: number;
  name: string;
  healthCheckRate: number;
  type: SubSystemType;
  commands: CommandSubSystem[];
  topics: TopicSubSystem[];
  diagLed: number;
  diagnostic: string;
  depends: string[];
  timeout: number;
  diagRetry: number;
}

export interface SubSystemServiceState {
  sortedSubSystems: SubSystem[];
  subSystemsMap: Map<string, SubSystem>;
  startedSubSystemsMap: Map<string, SubSystem>;
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

export interface IRunAllResponse {
  pid: number;
  commandId: number;
}

export interface ISubSystemExtraInfo {
  subSystemId: number;
}

export type IResponse = IErrorResponse | ISuccessResponse;

export type SubSystemDto = Modify<
  SubSystem,
  {
    commands: CommandsStatus[];
    topics: TopicType[];
    status: SubSystemStatusType;
    error: (IResponse & ISubSystemExtraInfo)[];
  }
>;

export enum EnumVehicleStatusState {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  FETCHING = 'FETCHING',
  ROS_BRIDGE_INIT = 'ROS_BRIDGE_INIT',
  ROS_CONNECTION_INIT = 'ROS_CONNECTION_INIT'
}

export enum EnumRosBridgeTopic {
  LED_DIAGNOSTIC = '/ledHealth'
}

export enum EnumVehicleConnectionState {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE'
}

export enum EnumRosBridgeCommunicationPort {
  INTERFACE_STATE = 'INTERFACE_STATE'
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

export interface MsgReceived {
  eventName: string;
  data: string;
}
export interface InterfaceStatus {
  interfaceName: string;
  machines: MachinesStatus[];
  status?: InterfaceFileStatusType;
  statusRunAll: EnumStatusRunAllCommands;
  statusCommands: CommandsStatus[];
}

export interface InterfaceStatusDto extends InterfaceStatus {
  sensors: TopicType[];
  algorithms: TopicType[];
}

export interface InterfaceStatusSubSystemDto extends InterfaceStatus {
  subSystems: SubSystemDto[];
}

export interface TopicStatus {
  sensors: SensorsStatus[];
  algorithms: AlgorithmsStatus[];
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

export interface IRosBridgePublishTopic {
  topicName: EnumRosBridgeTopic;
  messageType?: string;
}

export const ROS_BRIDGE_WORKER_HEALTHCHECK = {
  ROS_BRIDGE_PING_RETRY: 10,
  ROS_BRIDGE_PING_BUFFER_TIME: 5000,
  ROS_BRIDGE_PING_TIMEOUT: 5000,
  ROS_BRIDGE_PING_INTERVAL: 5000
};

export const ROS_BRIDGE_WORKER_TOPIC = {
  ROS_TOPIC_CHUNK_SIZE: 35,
  ROS_TOPIC_CONNECT_BUFFER_TIME: 1000,
  ROS_TOPIC_POLL_INTERVAL: 1000,
  ROS_TOPIC_PASSIVE_INTERVAL: 1000
};

export const ROS_BRIDGE_INIT = {
  PROGRESS_INTERVAL: 3000,
  CHECK_INTERVAL: 500,
  PERCENT_MOVEMENT_PROGRESS: 20
};

export interface IRosBridgeMessage {
  header: {
    stamp: {
      secs: number;
      nsecs: number;
    };
  };
  pose: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    orientation: {
      x: number;
      y: number;
      z: number;
      w: number;
    };
  };
  twist: {
    linear: {
      x: number;
      y: number;
      z: number;
    };
    angular: {
      x: number;
      y: number;
      z: number;
    };
  };
}

export interface ISubSystemWorkerMessage {
  subSystems: SubSystem[];
  startedSubSystem: Map<string, SubSystem>;
  topicMap: Map<number, TopicType>;
  commandMap: Map<number, CommandsStatus>;
}

export interface ISubSystemWorkerReturn {
  diagnosticSubSystem: SubSystem[];
  diagLedStatus: number[];
}

export interface StdInt16ArrayTopicMessage {
  data: number[];
}
