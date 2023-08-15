import { Controller, Get, Req, Res, UseGuards, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UserGuard, Serialize, TimeoutInterceptor, User, ControllerResponse } from '../core';

@ApiTags('user')
@Controller('user')
@UseInterceptors(TimeoutInterceptor)
export class UserController {
  @Get('/me')
  @UseGuards(UserGuard)
  @Serialize(User)
  getMe(@Res() res: Response, @Req() req: Request) {
    return new ControllerResponse(res, req.user, HttpStatus.OK);
  }
}
