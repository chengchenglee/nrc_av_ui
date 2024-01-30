import { CommandsStatus, ExecutionStatus, StatusRunAll } from '../constants/executionStatus';
import { AlgorithmStatus, MachineStatus, SensorStatus } from '../constants/machineStatus';
import { ExtraVehicleInformation } from './vehicle';

export type CommonInterfaceStatusDTO<T> = {
  name: string;
  status: T;
};

export type ExtraInterfaceStatusDTO = {
  healthCheckRate: number;
  msgCount: number;
};

export type MachineStatusDTO = CommonInterfaceStatusDTO<MachineStatus>;
export type SensorStatusDTO = CommonInterfaceStatusDTO<SensorStatus> & ExtraInterfaceStatusDTO;
export type AlgorithmStatusDTO = CommonInterfaceStatusDTO<AlgorithmStatus> &
  ExtraInterfaceStatusDTO;
export type CommandsStatusDTO = CommonInterfaceStatusDTO<CommandsStatus> & {
  command: string;
  pid: number;
  id: number;
};

export interface GetInterfaceInfoDTO {
  interfaceName: string;
  interfaceId: number | undefined;
  status: ExecutionStatus;
  statusRunAll: StatusRunAll;
  machines: MachineStatusDTO[];
  subSystems: any[];
  sensors: SensorStatusDTO[];
  algorithms: AlgorithmStatusDTO[];
  statusCommands: CommandsStatusDTO[];
  extraVehicleInformation: ExtraVehicleInformation;
}
