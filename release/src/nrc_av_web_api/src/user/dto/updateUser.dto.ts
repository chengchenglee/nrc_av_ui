import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';

export class UpdateUserDto {
  @ApiProperty({
    description: 'email',
    example: 'kevin@bollywood.com'
  })
  email: string;

  @ApiProperty({
    description: 'role',
    example: [1]
  })
  roles: number[];

  @ApiProperty({
    description: 'Is Active',
    example: true
  })
  isActive: boolean;
}

export const vUpdateUserDTO = joi.object<UpdateUserDto>({
  email: joi.string().email().required(),
  roles: joi.array().items(joi.number()).required().min(1),
  isActive: joi.boolean().required()
});
