import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { userValidateSchema } from '../../core';

export class ChangePasswordDTO {
  @ApiProperty({ description: 'Username', example: 'nissan' })
  username: string;

  @ApiProperty({ description: 'Password', example: 'password' })
  password: string;

  @ApiProperty({ description: 'New Password', example: 'newpassword' })
  newPassword: string;
}

export const vChangePasswordDTO = joi.object<ChangePasswordDTO>({
  username: userValidateSchema.username,
  password: userValidateSchema.password,
  newPassword: userValidateSchema.password
});
