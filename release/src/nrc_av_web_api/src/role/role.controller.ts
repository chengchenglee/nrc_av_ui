import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Res,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  ControllerResponse,
  PermissionEnum,
  Serialize,
  TimeoutInterceptor,
  UserGuard
} from '../core';
import { PermissionRequired } from '../core/guards/permission.decorator';
import { RoleService } from './role.service';
import { RoleSerialize } from './serialize/role.serialize';

@ApiTags('role')
@Controller('role')
@ApiCookieAuth()
@UseGuards(UserGuard)
@UseInterceptors(TimeoutInterceptor)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('/list')
  @Serialize(RoleSerialize)
  @PermissionRequired(PermissionEnum.READ_ROLES)
  async listRoles(@Res() res: Response) {
    return new ControllerResponse(res, await this.roleService.listRoles(), HttpStatus.OK);
  }

  @Get('/:id')
  @Serialize(RoleSerialize)
  @PermissionRequired(PermissionEnum.READ_ROLES)
  async getRoleById(@Res() res: Response, @Param('id') id: string) {
    return new ControllerResponse(res, await this.roleService.getRoleById(id), HttpStatus.OK);
  }
}
