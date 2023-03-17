import { Controller, Get, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UserGuard } from '../core';

@ApiTags('user')
@Controller('user')
export class UserController {
  @Get('/me')
  @UseGuards(UserGuard)
  getMe(@Res() res: Response, @Req() req: Request) {
    return res.status(HttpStatus.OK).send(req.user);
  }
}
