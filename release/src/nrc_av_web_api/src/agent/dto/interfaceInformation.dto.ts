import { MachineStatusDTO } from './machineStatus.dto';
import { SubSystemStatusDTO } from './subSystemStatus.dto';

export class InterfaceInformationDTO {
  constructor(
    readonly vehicleId: number,
    readonly interfaceId: number | undefined,
    readonly interfaceName: string,
    readonly machines: MachineStatusDTO[],
    readonly subSystems: SubSystemStatusDTO[],
    readonly status: string,
    readonly statusRunAll: string
  ) {}
}
