import { IsString } from 'class-validator';

export class AgentUpdationDTO {
  @IsString()
  name: string;

  @IsString()
  model: string;
}
