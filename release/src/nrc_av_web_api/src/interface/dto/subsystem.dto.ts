import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import joi from 'joi';
import { SubSystemType } from '../../core';
import { CommandDTO, vCommandDTO } from './command.dto';
import { TopicDTO, vTopicDTO } from './topic.dto';

export class SubSystemDTO {
  @Expose()
  @ApiProperty({
    description: 'id',
    example: 1
  })
  id: number;

  @Expose()
  @ApiProperty({
    description: 'name',
    example: 'GPS_Raw'
  })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'description',
    example: 'System for sensor'
  })
  description: string;

  @Expose()
  @ApiProperty({
    description: 'type',
    enum: ['Sensor', 'Algorithm']
  })
  type: SubSystemType;

  @Expose()
  @ApiProperty({
    description: 'command',
    example: [
      {
        name: '1 sim1',
        command: 'roslaunch nrc_av_ui sim1.launch',
        nodes: [{ name: 'sim1_node' }],
        inclByDef: false
      },
      {
        name: '1 sim2',
        command: 'rosrun nrc_av_ui sim2',
        nodes: [{ name: 'sim2' }],
        inclByDef: false,
        launchTime: 0.0
      }
    ],
    isArray: true
  })
  commands: CommandDTO[];

  @Expose()
  @ApiProperty({
    description: 'topic',
    example: [
      {
        name: 'CAR',
        normalRate: 10.0,
        errRate: 3.0,
        warnRate: 6.0,
        topicName: '/CtrlStateFLG',
        topicType: 'CtrlStateFLG'
      },
      {
        name: 'GPS',
        normalRate: 10.0,
        errRate: 3.0,
        warnRate: 8.0,
        topicName: '/dynamic_global_pose',
        topicType: 'DynamicPoseWithCovar'
      }
    ],
    isArray: true
  })
  topics: TopicDTO[];

  @Expose()
  @ApiProperty({
    description: 'diagLed',
    example: 1
  })
  diagLed: number;

  @Expose()
  @ApiProperty({
    description: 'timeout',
    example: 30
  })
  timeout: number;

  @Expose()
  @ApiProperty({
    description: 'diagRetry',
    example: 5
  })
  diagRetry: number;

  @Expose()
  @ApiProperty({
    description: 'diagnostic',
    example: 'diag.py'
  })
  diagnostic: string;

  @Expose()
  @ApiProperty({
    description: 'depends',
    example: ['Pose']
  })
  depends: string[];
}

export const vSubSystemDTO = joi.object<SubSystemDTO>({
  id: joi.number(),
  name: joi.string().required(),
  description: joi.string().allow('', null),
  type: joi.string().required(),
  commands: joi.array().items(vCommandDTO),
  diagLed: joi.number().allow(null),
  timeout: joi.number().allow(null),
  diagRetry: joi.number().allow(null),
  diagnostic: joi.string().allow(null),
  topics: joi.array().items(vTopicDTO).allow(null),
  depends: joi.array().items(joi.string()).allow(null)
});
