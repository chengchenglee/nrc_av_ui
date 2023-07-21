import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';

export class CommandDTO {
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
    description: 'agent name',
    example: 'KellyTest'
  })
  nodes: string;

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
}

export const vCommandDTO = joi.object<CommandDTO>({
  id: joi.number(),
  name: joi.string(),
  command: joi.string().allow(''),
  nodes: joi.string().allow('', null),
  inclByDef: joi.boolean(),
  autoStart: joi.boolean(),
  autoRecord: joi.boolean()
});
