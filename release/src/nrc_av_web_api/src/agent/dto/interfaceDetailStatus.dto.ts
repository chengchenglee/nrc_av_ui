import { IsArray, IsOptional, IsString } from 'class-validator';
import { ExtraVehicleInformationDTO } from './extraVehicleInformation.dto';
import { MachineStatusDTO } from './machineStatus.dto';
import { SubSystemStatusDTO } from './subSystemStatus.dto';

export class InterfaceDetailStatusDTO {
  @IsString()
  interfaceName: string;

  @IsArray()
  machines: MachineStatusDTO[];

  @IsArray()
  subSystems: SubSystemStatusDTO[];

  @IsOptional()
  extraVehicleInformation: ExtraVehicleInformationDTO;

  @IsString()
  status: string;

  @IsString()
  statusRunAll: string;
}
