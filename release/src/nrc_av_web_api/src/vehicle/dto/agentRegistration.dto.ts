import { IsString } from 'class-validator';

export class AgentRegistrationDTO {
  @IsString()
  name: string;

  @IsString()
  model: string;

  @IsString()
  macAddress: string;

  @IsString()
  certKey: string;
}
