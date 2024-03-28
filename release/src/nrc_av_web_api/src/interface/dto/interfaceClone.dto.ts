import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';

export class InterfaceCloneDTO {
  @ApiProperty({
    description: 'Interface clone name',
    example: 'kelly_interface_clone',
    nullable: false
  })
  name: string;
}

export const vInterfaceCloneDTO = joi.object<InterfaceCloneDTO>({
  name: joi.string().required().min(1)
});
