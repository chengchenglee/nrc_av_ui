import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';

export class CreateUserDto {
  @ApiProperty({
    description: 'username',
    example: 'KevinHart'
  })
  username: string;

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
}

export const vCreateUserDTO = joi.object<CreateUserDto>({
  username: joi.string().required(),
  email: joi.string().email().required(),
  roles: joi.array().items(joi.number()).required().min(1)
});
