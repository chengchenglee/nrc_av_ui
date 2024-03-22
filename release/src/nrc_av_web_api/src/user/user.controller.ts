import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  Post,
  Body,
  UsePipes,
  Query,
  Delete,
  ParseIntPipe,
  Param
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  UserGuard,
  Serialize,
  TimeoutInterceptor,
  User,
  ControllerResponse,
  HttpBodyValidatorPipe,
  PermissionEnum,
  HttpQueryValidatorPipe
} from '../core';
import { PermissionRequired } from '../core/guards/permission.decorator';
import { CreateUserDto, vCreateUserDTO } from './dto/createUser.dto';
import { DeleteUserDTO, vDeleteUserDTO } from './dto/deleteUser.dto';
import { UserFilterDTO, vUserFilterDTO } from './dto/userFilter.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
@UseGuards(UserGuard)
@UseInterceptors(TimeoutInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('/me')
  @Serialize(User)
  getMe(@Res() res: Response, @Req() req: Request) {
    return new ControllerResponse(res, req.user, HttpStatus.OK);
  }

  @Get('/list')
  @PermissionRequired(PermissionEnum.READ_USERS)
  @Serialize(User)
  @UsePipes(new HttpQueryValidatorPipe(vUserFilterDTO))
  async getListUsers(@Res() res: Response, @Query() query: UserFilterDTO) {
    return new ControllerResponse(res, await this.userService.listUser(query), HttpStatus.OK);
  }

  @Post('/')
  @PermissionRequired(PermissionEnum.CREATE_USER)
  @Serialize(User)
  @UsePipes(new HttpBodyValidatorPipe(vCreateUserDTO))
  async createUser(@Res() res: Response, @Body() body: CreateUserDto) {
    return new ControllerResponse(res, await this.userService.createUser(body), HttpStatus.OK);
  }

  @Delete('/:id')
  @PermissionRequired(PermissionEnum.DELETE_USER)
  @UsePipes(new HttpBodyValidatorPipe(vDeleteUserDTO))
  async deleteUser(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DeleteUserDTO
  ) {
    await this.userService.deleteUser(id, query);
    return res.status(HttpStatus.OK).send();
  }
}
