import { CommandsStatus } from '../constants/executionStatus';
import { ModelDTO } from './model';

export interface FilterInterfaceParams {
  name?: string;
  currentPage?: number;
  pageSize?: number;
  order?: 'ASC' | 'DESC';
  orderBy?: string;
}

export interface Machine {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  addr: string;
}

export interface CommandSubSystem {
  id: number;
  command: string;
  pid: number;
  name: string;
  status: CommandsStatus;
}

export type AddInterfaceCommandsSubSystemDTO = Pick<CommandSubSystem, 'name' | 'command'>;

export interface HealthTopics {
  id: number;
  name: string;
  topicName: string;
  topicType: string;
  normalRate: number;
  errRate: number;
  warnRate: number;
  status: string;
  uuid: string;
  msgCount: number;
  avgDowntimeInit: number;
  lastGlobalStamp: number;
  lastMsgStamp: number;
  healthCheckRate: number;
}

export interface HealthTopicsDTO {
  name: string;
  topicName: string;
  topicType: string;
  norRate: number | null;
  errRate: number | null;
  warnRate: number | null;
}
export interface SensorSubSystem {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  descriptiton: string;
  healthTopics: HealthTopics[];
  commands: AddInterfaceCommandsSubSystemDTO[];
  diagLED: number;
  depends: string[];
  diagnostic: string;
}

export interface AlgorithmSubSystem {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  descriptiton: string;
  healthTopics: HealthTopics[];
  commands: AddInterfaceCommandsSubSystemDTO[];
  diagLED: number;
  depends: string[];
  diagnostic: string;
}

export interface Command {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  command: string;
  nodes: string;
  inclByDef: boolean;
  autoStart: boolean;
  autoRecord: boolean;
}

export type AddInterfaceCommandsDTO = Pick<
  Command,
  'name' | 'command' | 'nodes' | 'inclByDef' | 'autoRecord' | 'autoStart'
>;

export interface Sensor {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  errRate: number;
  warnRate: number;
  topicName: string;
  topicType: string;
}

export type AddInterfaceSensorsDTO = Pick<
  Sensor,
  'name' | 'errRate' | 'warnRate' | 'topicName' | 'topicType'
>;

export interface Algorithm {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  errRate: number;
  warnRate: number;
  topicName: string;
  topicType: string;
  commands: AddInterfaceCommandsDTO[];
}

export type AddInterfaceAlgorithmDTO = Pick<
  Algorithm,
  'name' | 'errRate' | 'warnRate' | 'topicName' | 'topicType'
>;

export interface SubsystemDTO {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  description: string;
  topics: HealthTopics[];
  diagLed: number;
  depends: string[];
  diagnostic: string;
  timeout: number;
  diagRetry: number;
}

export type AddInterfaceSubsystemsDTO = Pick<
  SubsystemDTO,
  'name' | 'description' | 'depends' | 'diagLed' | 'diagnostic' | 'topics' | 'diagRetry' | 'timeout'
>;

export interface Destination {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  posX: number;
  posY: number;
  posTh: number;
}

export interface MultiDestination {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  destinations: Destination[];
}

export interface InterfaceDestination {
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  interface_id: number;
  destination_id: number;
  destination: Destination;
  name: string;
}

export interface InterfaceListItem {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  model: ModelDTO;
}

export interface InterfaceList {
  interfaces: InterfaceListItem[];
  total: number;
}

export type DestinationPosition = Pick<Destination, 'posX' | 'posY' | 'posTh'>;
export type AddInterfaceMachinesDTO = Pick<Machine, 'name' | 'addr'>;

export interface AddInterfaceMultiDestinationDTO {
  name: string;
  destinations: DestinationPosition[];
}

export interface AddDestinationDTO extends DestinationPosition {
  name: string;
}
export interface AddEditInterfaceDTO {
  name: string;
  // subSystems: AddInterfaceSubsystemsDTO[];
  sensors: AddInterfaceSensorsDTO[];
  algorithms: AddInterfaceAlgorithmDTO[];
  machines: AddInterfaceMachinesDTO[];
  commands: AddInterfaceCommandsDTO[];
  interfaceDestinations: AddDestinationDTO[];
  multiDestinations: AddInterfaceMultiDestinationDTO[];
}

export interface EditDestinationDTO {
  name: string;
  destination: DestinationPosition;
}

export interface EditDataInterfaceDTO {
  name: string;
  // subSystems: AddInterfaceSubsystemsDTO[];
  sensors: AddInterfaceSensorsDTO[];
  algorithms: AddInterfaceAlgorithmDTO[];
  machines: AddInterfaceMachinesDTO[];
  commands: AddInterfaceCommandsDTO[];
  interfaceDestinations: EditDestinationDTO[];
  multiDestinations: AddInterfaceMultiDestinationDTO[];
}

export interface ImportInterfaceDTO {
  name: string;
  content: string;
  subSystems: AddInterfaceSubsystemsDTO[];
  machines: AddInterfaceMachinesDTO[];
  interfaceDestinations: AddDestinationDTO[];
  multiDestinations: AddInterfaceMultiDestinationDTO[];
}

export interface EditInterfaceDTO {
  id: number;
  data: any;
}
export interface FilterInterfaceDTO {
  name?: string;
}
export interface CloneDataInterfaceDTO {
  name: string;
}
export interface CloneInterfaceDTO {
  id: number;
  data: CloneDataInterfaceDTO;
}
export interface Message {
  status: string;
  message: string;
  subSystemId: number;
}

export interface InterfaceMessage {
  status: string;
  message: Message[];
}

export interface Subsystem {
  id: number;
  name: string;
  description: string;
  type: string;
  topics: HealthTopics[];
  commands: CommandSubSystem[];
  diagLED: number;
  depends: any[];
  error: Message[];
  diagnostic: string;
  status: string;
  timeout: number;
  diagRetry: number;
  diagTries: number;
  isProcessing: boolean;
  isDiagnostic: boolean;
}

export interface InterfaceDetailDTO {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  machines: Machine[];
  subSystems: Subsystem[];
  sensors: Sensor[];
  commands: Command[];
  algorithms: Algorithm[];
  multiDestinations: MultiDestination[];
  interfaceDestinations: InterfaceDestination[];
}
