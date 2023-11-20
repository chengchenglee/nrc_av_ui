import { IsArray, IsString } from 'class-validator';
import { MachineStatusDTO } from './machineStatus.dto';
import { SubSystemStatusDTO } from './subSystemStatus.dto';

export class InterfaceDetailStatusDTO {
  @IsString()
  interfaceName: string;

  @IsArray()
  machines: MachineStatusDTO[];

  @IsArray()
  subSystems: SubSystemStatusDTO[];

  @IsString()
  status: string;

  @IsString()
  statusRunAll: string;
}
