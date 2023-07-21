import { IsNumber, IsString } from 'class-validator';

export class SensorStatusDTO {
  @IsString()
  name: string;

  @IsNumber()
  errRate: number;

  @IsNumber()
  warnRate: number;

  @IsString()
  topicName: string;

  @IsString()
  topicType: string;
}
