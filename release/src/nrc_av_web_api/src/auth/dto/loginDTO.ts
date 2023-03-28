import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { userValidateSchema } from '../../core/models';

export class LoginDTO {
  @ApiProperty({ description: 'username', example: 'nissan' })
  username: string;

  @ApiProperty({ description: 'Password', example: '123456' })
  password: string;
}

export const vLoginDTO = joi.object<LoginDTO>({
  username: userValidateSchema.username,
  password: userValidateSchema.password
});
