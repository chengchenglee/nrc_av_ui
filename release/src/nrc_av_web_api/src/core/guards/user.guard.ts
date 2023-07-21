import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  HttpStatus
} from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { AuthService } from '../../auth/auth.service';
import { User } from '../models';

export interface JwtToken {
  id: number;
}

@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly authService: AuthService, private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();

    const authorization = req.cookies['access-token'] || '';
    const { data, error } = await this.authService.verifyToken<JwtToken>(authorization);
    if (error) {
      throw new HttpException({}, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: data.id }
    });

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
