import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { SortOrder, User, userOrderBy } from '../../core';

export class UserFilterDTO {
  @ApiProperty({ description: 'Username', example: 'nissandev', nullable: true })
  username: string;

  @ApiProperty({ description: 'Email', example: 'nissan@gmail.com', nullable: true })
  email: string;

  @ApiProperty({ description: 'Is Active', example: 'true', nullable: true })
  isActive: boolean;

  @ApiProperty({ description: 'Current Page', example: '0', nullable: true })
  currentPage: number;

  @ApiProperty({ description: 'Page Size', example: '10', nullable: true })
  pageSize: number;

  @ApiProperty({ description: 'Order', example: 'ASC', nullable: true })
  order: SortOrder;

  @ApiProperty({ description: 'Order By', example: 'username', nullable: true })
  orderBy: string;
}

export const vUserFilterDTO = joi.object<UserFilterDTO>({
  username: joi.string().required().failover(''),
  email: joi.string().email().required().failover(''),
  isActive: joi.boolean(),
  currentPage: joi.number().min(0).required().failover(0),
  pageSize: joi.number().min(1).required().failover(10),
  orderBy: joi
    .string()
    .failover('username')
    .valid(...userOrderBy)
    .required(),
  order: joi
    .string()
    .allow('')
    .failover(SortOrder.DESC)
    .valid(SortOrder.ASC, SortOrder.DESC)
    .required()
});

export interface UserList {
  users: User[];
  total: number;
}
