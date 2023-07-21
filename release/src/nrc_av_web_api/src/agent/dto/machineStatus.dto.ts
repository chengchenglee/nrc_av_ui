import { IsString } from 'class-validator';

export class MachineStatusDTO {
  @IsString()
  name: string;

  @IsString()
  addr: string;
}
