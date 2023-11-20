import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import joi from 'joi';

export class NodeDTO {
  @Expose()
  @ApiProperty({
    description: 'id',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'name',
    example: 'sim1_node'
  })
  name: string;
}

export const vNodeDTO = joi.object<NodeDTO>({
  id: joi.number(),
  name: joi.string().required()
});
