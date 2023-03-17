import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { nodeValidateSchema } from '../../core';

export class CreateNodeDTO {
  @ApiProperty({
    description: 'Name',
    example: 'sim 3'
  })
  name: string;

  @ApiProperty({
    description: 'Package',
    example: 'nrc'
  })
  packageName: string;
}

export const vCreateNodeDTO = joi.object<CreateNodeDTO>({
  name: nodeValidateSchema.name.required(),
  packageName: nodeValidateSchema.packageName.required()
});
