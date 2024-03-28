import { ExtraVehicleInformationDTO } from './extraVehicleInformation.dto';
import { MachineStatusDTO } from './machineStatus.dto';
import { SubSystemStatusDTO } from './subSystemStatus.dto';

export enum RedButtonResponse {
  RECORDING = 1,
  STOP = 2
}

export class InterfaceInformationDTO {
  constructor(
    readonly vehicleId: number,
    readonly interfaceId: number | undefined,
    readonly interfaceName: string,
    readonly machines: MachineStatusDTO[],
    readonly subSystems: SubSystemStatusDTO[],
    readonly status: string,
    readonly statusRunAll: string,
    readonly extraVehicleInformation: ExtraVehicleInformationDTO,
    readonly mapName: string,
    readonly redButtonStatus: RedButtonResponse
  ) {}
}
