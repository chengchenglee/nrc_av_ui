import { IsNumber, IsString } from 'class-validator';

export class CommandsStatusDTO {
  @IsNumber()
  id: number;

  @IsNumber()
  pid: number;

  @IsString()
  name: string;

  @IsString()
  command: string;
}
