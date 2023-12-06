import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import joi from 'joi';
import { NodeDTO, vNodeDTO } from './node.dto';

export class CommandDTO {
  @Expose()
  @ApiProperty({
    description: 'id',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'name',
    example: 'kelly_interface'
  })
  name: string;

  @ApiProperty({
    description: 'command',
    example: 'roslaunch nrc_av_ui sim1.launch'
  })
  command: string;

  @ApiProperty({
    description: 'include by def',
    example: false
  })
  inclByDef: boolean;

  @ApiProperty({
    description: 'auto start',
    example: false
  })
  autoStart: boolean;

  @ApiProperty({
    description: 'auto record',
    example: false
  })
  autoRecord: boolean;

  @ApiProperty({
    description: 'auto record',
    example: 0.0
  })
  launchTime: number;

  @ApiProperty({
    description: 'node',
    example: [{ name: 'sim1_node' }],
    isArray: true
  })
  nodes: NodeDTO[];
}

export const vCommandDTO = joi.object<CommandDTO>({
  id: joi.number(),
  name: joi.string().required(),
  command: joi.string().allow(''),
  inclByDef: joi.boolean(),
  autoStart: joi.boolean(),
  autoRecord: joi.boolean(),
  launchTime: joi.number(),
  nodes: joi.array().max(1).items(vNodeDTO)
});
