import { AlgorithmStatus, MachineStatus, SensorStatus } from '../constants/machineStatus';

export type CommonInterfaceStatusDTO<T> = {
  name: string;
  status: T;
};

export type MachineStatusDTO = CommonInterfaceStatusDTO<MachineStatus>;
export type SensorStatusDTO = CommonInterfaceStatusDTO<SensorStatus>;
export type AlgorithmStatusDTO = CommonInterfaceStatusDTO<AlgorithmStatus>;

export interface GetInterfaceInfoDTO {
  machines: MachineStatusDTO[];
  sensors: SensorStatusDTO[];
  algorithms: AlgorithmStatusDTO[];
}
