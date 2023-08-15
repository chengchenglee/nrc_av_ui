import { AlgorithmStatusDTO } from './algorithmStatus.dto';
import { CommandsStatusDTO } from './commandsStatus.dto';
import { MachineStatusDTO } from './machineStatus.dto';
import { SensorStatusDTO } from './sensorStatus.dto';

export class InterfaceInformationDTO {
  constructor(
    readonly vehicleId: number,
    readonly interfaceId: number | undefined,
    readonly interfaceName: string,
    readonly machines: MachineStatusDTO[],
    readonly algorithms: AlgorithmStatusDTO[],
    readonly sensors: SensorStatusDTO[],
    readonly statusCommands: CommandsStatusDTO[],
    readonly status: string,
    readonly statusRunAll: string
  ) {}
}
