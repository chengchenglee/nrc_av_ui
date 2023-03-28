import { Body, Controller, Post, Res, UsePipes } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HttpJoiValidatorPipe, constant } from '../core';
import { AuthService } from './auth.service';
import { LoginDTO, vLoginDTO } from './dto/loginDTO';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @ApiOperation({ summary: 'Login' })
  @ApiCreatedResponse({ type: String, description: 'access token' })
  @UsePipes(new HttpJoiValidatorPipe(vLoginDTO))
  async login(@Body() body: LoginDTO, @Res() res: Response) {
    const accessToken = await this.authService.login(body);

    return res
      .cookie(constant.authController.tokenName, accessToken, {
        maxAge: constant.authController.loginCookieTime
      })
      .send(accessToken);
  }

  @Post('/logout')
  logout(@Res() res: Response) {
    return res
      .cookie(constant.authController.tokenName, '', {
        maxAge: 0
      })
      .send();
  }
}
