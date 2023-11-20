import { IsNumber, IsString } from 'class-validator';

export class TopicStatusDTO {
  @IsString()
  name: string;

  @IsNumber()
  healthCheckRate: number;

  @IsNumber()
  msgCount: number;

  @IsNumber()
  errRate: number;

  @IsNumber()
  warnRate: number;

  @IsString()
  topicName: string;

  @IsString()
  topicType: string;
}
