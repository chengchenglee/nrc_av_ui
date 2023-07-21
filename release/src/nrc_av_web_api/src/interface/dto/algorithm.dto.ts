import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';

export class AlgorithmDTO {
  @ApiProperty({
    description: 'id',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'name',
    example: 'GPSBASE'
  })
  name: string;

  @ApiProperty({
    description: 'errRate',
    example: 4
  })
  errRate: number;

  @ApiProperty({
    description: 'warnRate',
    example: 5
  })
  warnRate: number;

  @ApiProperty({
    description: 'topic name',
    example: '/CtrlStateFG'
  })
  topicName: string;

  @ApiProperty({
    description: 'topic type',
    example: 'CtrlStateFLG'
  })
  topicType: string;
}

export const vAlgorithmDTO = joi.object<AlgorithmDTO>({
  id: joi.number(),
  name: joi.string().required(),
  errRate: joi.number().required(),
  warnRate: joi.number().required(),
  topicName: joi.string().required(),
  topicType: joi.string().required()
});
