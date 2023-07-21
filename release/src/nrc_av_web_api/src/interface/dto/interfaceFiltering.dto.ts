import { ApiProperty } from '@nestjs/swagger';
import joi from 'joi';
import { Interface, SortOrder, interfaceOrderBy } from '../../core';

export class InterfaceFilteringDTO {
  @ApiProperty({ description: 'Interface name', example: 'kelly_interface', nullable: true })
  name: string;

  @ApiProperty({ description: 'Current Page', example: '0', nullable: true })
  currentPage: number;

  @ApiProperty({ description: 'Page Size', example: '4', nullable: true })
  pageSize: number;

  @ApiProperty({ description: 'Order', example: 'ASC', nullable: true })
  order: SortOrder;

  @ApiProperty({ description: 'Order By', example: 'name', nullable: true })
  orderBy: string;
}

export const vInterfaceFilteringDTO = joi.object<InterfaceFilteringDTO>({
  name: joi.string().required().failover(''),
  currentPage: joi.number().min(0).required().failover(0),
  pageSize: joi.number().min(1).required().failover(10),
  orderBy: joi
    .string()
    .failover('name')
    .valid(...interfaceOrderBy)
    .required(),
  order: joi
    .string()
    .allow('')
    .failover(SortOrder.ASC)
    .valid(SortOrder.ASC, SortOrder.DESC)
    .required()
});

export interface InterfaceList {
  interfaces: Interface[];
  total: number;
}
