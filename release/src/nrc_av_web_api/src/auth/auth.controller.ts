import { Body, Controller, Post, Res, UseInterceptors, UsePipes } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HttpBodyValidatorPipe, constant } from '../core';
import { TimeoutInterceptor } from '../core/interceptors';
import { AuthService } from './auth.service';
import { LoginDTO, vLoginDTO } from './dto/loginDTO';

@ApiTags('auth')
@Controller('auth')
@UseInterceptors(TimeoutInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @ApiOperation({ summary: 'Login' })
  @ApiCreatedResponse({ type: String, description: 'access token' })
  @UsePipes(new HttpBodyValidatorPipe(vLoginDTO))
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
