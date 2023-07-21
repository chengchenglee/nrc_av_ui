import { AlgorithmStatusDTO } from './algorithmStatus.dto';
import { MachineStatusDTO } from './machineStatus.dto';
import { SensorStatusDTO } from './sensorStatus.dto';

export class InterfaceInformationDTO {
  constructor(
    readonly vehicleId: number,
    readonly interfaceId: number,
    readonly machines: MachineStatusDTO[],
    readonly algorithms: AlgorithmStatusDTO[],
    readonly sensors: SensorStatusDTO[]
  ) {}
}
