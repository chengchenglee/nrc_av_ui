import { CommandsStatus, ExecutionStatus, StatusRunAll } from '../constants/executionStatus';
import { AlgorithmStatus, MachineStatus, SensorStatus } from '../constants/machineStatus';

export type CommonInterfaceStatusDTO<T> = {
  name: string;
  status: T;
};

export type MachineStatusDTO = CommonInterfaceStatusDTO<MachineStatus>;
export type SensorStatusDTO = CommonInterfaceStatusDTO<SensorStatus>;
export type AlgorithmStatusDTO = CommonInterfaceStatusDTO<AlgorithmStatus>;
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
  sensors: SensorStatusDTO[];
  algorithms: AlgorithmStatusDTO[];
  statusCommands: CommandsStatusDTO[];
}
