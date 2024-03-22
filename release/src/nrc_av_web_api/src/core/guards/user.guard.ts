import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  HttpStatus
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DataSource, In } from 'typeorm';
import { AuthService } from '../../auth/auth.service';
import { message } from '../constants';
import { Role, User } from '../models';

export interface JwtToken {
  id: number;
}

@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();

    const authorization = req.cookies['access-token'] || '';
    const { data, error } = await this.authService.verifyToken<JwtToken>(authorization);
    if (error) {
      throw new HttpException({}, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.dataSource.getRepository(User).findOne({
      relations: {
        roles: true
      },
      where: { id: data.id, isDeleted: false }
    });

    if (!user) {
      throw new HttpException({}, HttpStatus.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new HttpException({ errorMessage: message.userNotActive }, HttpStatus.BAD_REQUEST);
    }

    user.password = '';
    req.user = user;

    const roles = await this.dataSource.getRepository(Role).find({
      relations: {
        permissions: true
      },
      where: {
        name: In(user.roles.map((role) => role.name)),
        isDeleted: false
      }
    });

    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());

    if (!requiredPermissions) {
      return true;
    }

    const transformedPermissions = new Set<string>(
      roles.flatMap((role) => role.permissions.map((permission) => permission.name))
    );

    return this.matchPermission(requiredPermissions, Array.from(transformedPermissions));
  }

  private getTokenFromHeader(authorization: string): string {
    return authorization.split(' ')[1];
  }

  private matchPermission(requiredPermissions: string[], userPermissions: string[]): boolean {
    return requiredPermissions.every((permission) => userPermissions.includes(permission));
  }
}
