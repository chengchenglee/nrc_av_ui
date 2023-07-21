import { IsNumber, IsString } from 'class-validator';

export class AlgorithmStatusDTO {
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
