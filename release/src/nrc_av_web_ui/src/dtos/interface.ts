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
export type AddInterfaceSensorsDTO = Pick<
  Sensor,
  'name' | 'errRate' | 'warnRate' | 'topicName' | 'topicType'
>;
export type AddInterfaceAlgorithmDTO = Pick<
  Algorithm,
  'name' | 'errRate' | 'warnRate' | 'topicName' | 'topicType'
>;
export type AddInterfaceCommandsDTO = Pick<
  Command,
  'name' | 'command' | 'nodes' | 'inclByDef' | 'autoRecord' | 'autoStart'
>;
export interface AddInterfaceMultiDestinationDTO {
  name: string;
  destinations: DestinationPosition[];
}

export interface AddDestinationDTO extends DestinationPosition {
  name: string;
}
export interface AddEditInterfaceDTO {
  name: string;
  machines: AddInterfaceMachinesDTO[];
  sensors: AddInterfaceSensorsDTO[];
  algorithms: AddInterfaceAlgorithmDTO[];
  commands: AddInterfaceCommandsDTO[];
  interfaceDestinations: AddDestinationDTO[];
  multiDestinations: AddInterfaceMultiDestinationDTO[];
}

export interface EditInterfaceDTO {
  id: number;
  data: AddEditInterfaceDTO;
}
export interface FilterInterfaceDTO {
  name?: string;
}

export interface InterfaceDetailDTO {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  name: string;
  machines: Machine[];
  sensors: Sensor[];
  algorithms: Algorithm[];
  commands: Command[];
  multiDestinations: MultiDestination[];
  interfaceDestinations: InterfaceDestination[];
}
