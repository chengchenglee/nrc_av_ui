import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { userValidateSchema } from '../../core/models';

export class LoginDTO {
  @ApiProperty({ description: 'username', example: 'username' })
  username: string;

  @ApiProperty({ description: 'Password', example: 'password' })
  password: string;
}

export const vLoginDTO = joi.object<LoginDTO>({
  username: userValidateSchema.username,
  password: userValidateSchema.password
});
