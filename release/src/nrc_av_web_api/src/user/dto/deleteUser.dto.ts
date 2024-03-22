import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';

export class DeleteUserDTO {
  @ApiProperty({ description: 'Delete user', example: 'True', required: false })
  permanent: boolean;
}

export const vDeleteUserDTO = joi.object<DeleteUserDTO>({
  permanent: joi.boolean().optional().default(false)
});
