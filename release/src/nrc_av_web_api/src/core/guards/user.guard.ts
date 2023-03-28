import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  HttpStatus
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import { DatabaseService } from '../database';
import { User } from '../models';

export interface JwtToken {
  id: string;
}

@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly databaseService: DatabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();

    const authorization = req.cookies['access-token'] || '';
    const { data, error } = await this.authService.verifyToken<JwtToken>(authorization);
    if (error) {
      throw new HttpException({}, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.databaseService.getOneByField(User, 'id', data.id);

    if (!user) {
      throw new HttpException({}, HttpStatus.UNAUTHORIZED);
    }

    user.password = '';
    req.user = user;

    return true;
  }

  getTokenFromHeader(authorization: string): string {
    return authorization.split(' ')[1];
  }
}
