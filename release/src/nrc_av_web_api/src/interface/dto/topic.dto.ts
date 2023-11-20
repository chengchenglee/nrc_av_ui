import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';

export class TopicDTO {
  @ApiProperty({
    description: 'id',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'name',
    example: 'kelly_topic'
  })
  name: string;

  @ApiProperty({
    description: 'topic name',
    example: '/dynamic_global_pose'
  })
  topicName: string;

  @ApiProperty({
    description: 'topic type',
    example: 'DynamicPoseWithCovar'
  })
  topicType: string;

  @ApiProperty({
    description: 'errRate',
    example: 10.0
  })
  normalRate: number;

  @ApiProperty({
    description: 'errRate',
    example: 4.0
  })
  errRate: number;

  @ApiProperty({
    description: 'warnRate',
    example: 5.0
  })
  warnRate: number;
}

export const vTopicDTO = joi.object<TopicDTO>({
  id: joi.number(),
  name: joi.string().required(),
  topicName: joi.string().required(),
  topicType: joi.string().required(),
  normalRate: joi.number().required(),
  errRate: joi.number().required(),
  warnRate: joi.number().required()
});
