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
  lastPrintedMsgStamp: number;
}

export interface AlgorithmsStatus extends Algorithm {
  status: RosTopicStatusType;
  uuid: string;
  msgCount: number;
}

export interface AlgorithmsTopic extends AlgorithmsStatus {
  lastMsgStamp: number;
  lastGlobalStamp: number;
  lastPrintedMsgStamp: number;
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
    isProcessing: boolean;
    isDiagnostic: boolean;
    diagTries: number;
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
  LED_DIAGNOSTIC = '/ailsv_led_health',
  ROS_BRIDGE_HEALTH = '/rosBridgeHealth'
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

export interface ExtraVehicleDetail {
  latitude: number;
  longitude: number;
  velocity: number;
}

export interface ExtraRosDetail {
  rosNodes: string[];
  rosTopics: string[];
}

export type WorkerVehicleDetailReturn = ExtraVehicleDetail & ExtraRosDetail;

export interface InterfaceStatusDto extends InterfaceStatus {
  sensors: TopicType[];
  algorithms: TopicType[];
  extraVehicleInformation: ExtraVehicleDetail;
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

export const ROS_BRIDGE_WORKER_HEALTHCHECK = {
  ROS_BRIDGE_CONNECT_RETRY: 3,
  ROS_BRIDGE_MESSAGE_TIMEOUT: 8000,
  ROS_BRIDGE_CHECK_INTERVAL: 3000,
  ROS_BRIDGE_PUBLISH_INTERVAL: 1000,
  ROS_BRIDGE_COOLDOWN: 5000
};

export const ROS_BRIDGE_WORKER_TOPIC = {
  ROS_TOPIC_CHUNK_SIZE: 35,
  ROS_TOPIC_CONNECT_BUFFER_TIME: 1000,
  ROS_TOPIC_POLL_INTERVAL: 4000,
  ROS_TOPIC_PASSIVE_INTERVAL: 2000,
  ROS_TOPIC_STOP_TIME: 4000
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
}

export interface IRosBridgeMessagePose extends IRosBridgeMessage {
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

export interface IRosBridgeMessageSpeed extends IRosBridgeMessage {
  velocity?: number;
}

export interface IRosBridgeMessageGPS extends IRosBridgeMessage {
  Latitude?: number;
  Longitude?: number;
}

export enum EnumVehicleDetailTopic {
  GPS = 'GPS',
  SPEED = 'SPEED'
}

export interface VehicleDetailTopic {
  topicName: string;
  topicType: EnumVehicleDetailTopic;
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

export enum EnumRosBridgeTopicWorkerMessage {
  INIT = 'INIT',
  STOP = 'STOP',
  START = 'START'
}

export interface IRosBridgeTopicWorkerMessageType {
  type: EnumRosBridgeTopicWorkerMessage;
}

export interface IRosBridgeTopicWorkerMessageInit extends IRosBridgeTopicWorkerMessageType {
  topicList: TopicType[];
}

export interface IRosBridgeTopicWorkerMessageStop extends IRosBridgeTopicWorkerMessageType {
  topidIdList: number[];
}

export interface IRosBridgeTopicWorkerMessageStart extends IRosBridgeTopicWorkerMessageType {
  topidIdList: number[];
}

export type IRosBridgeTopicWorkerMessage =
  | IRosBridgeTopicWorkerMessageInit
  | IRosBridgeTopicWorkerMessageStop
  | IRosBridgeTopicWorkerMessageStart;

export interface StdInt16ArrayTopicMessage {
  data: number[];
}
export interface StdStringTopicMessage {
  data: string;
}
