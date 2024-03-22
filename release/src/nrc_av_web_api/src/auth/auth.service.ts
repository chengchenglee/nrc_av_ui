import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { configuration } from '../config';
import { User, message } from '../core';
import { ChangePasswordDTO } from './dto/changePasswordDTO';
import { LoginDTO } from './dto/loginDTO';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService, private readonly dataSource: DataSource) {}

  async login(loginDTO: LoginDTO): Promise<string> {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { username: loginDTO.username, isDeleted: false }
    });

    if (!user) {
      throw new HttpException(
        { errorMessage: message.usernamePasswordIncorrect },
        HttpStatus.BAD_REQUEST
      );
    }

    const isCorrectPassword = await this.decryptPassword(loginDTO.password, user.password);
    if (!isCorrectPassword) {
      throw new HttpException(
        { errorMessage: message.usernamePasswordIncorrect },
        HttpStatus.BAD_REQUEST
      );
    }

    if (user.shouldChangePasswordOnNextLogin) {
      throw new HttpException(
        { errorMessage: message.requestChangePassword },
        HttpStatus.FAILED_DEPENDENCY
      );
    }

    if (!user.isActive) {
      throw new HttpException({ errorMessage: message.userNotActive }, HttpStatus.BAD_REQUEST);
    }

    return await this.createAccessToken(user);
  }

  // ---------------------------Bcrypt Service---------------------------
  async encryptPassword(password: string, saltOrRounds: string): Promise<string> {
    return await bcrypt.hash(password, saltOrRounds);
  }

  async decryptPassword(enteredPassword: string, passwordInDatabase: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, passwordInDatabase);
  }

  // ---------------------------Token Service---------------------------
  async encryptAccessToken(tokenData: Record<any, any>, minutes?: number): Promise<string> {
    try {
      if (minutes) {
        return await this.jwtService.signAsync(tokenData, {
          expiresIn: minutes * 60
        });
      } else {
        return this.jwtService.signAsync(tokenData);
      }
    } catch (err) {
      return null;
    }
  }

  async verifyToken<T>(tokenData: string): Promise<{ data: T; error: any }> {
    try {
      return {
        data: (await this.jwtService.verifyAsync<any>(tokenData)) as T,
        error: null
      };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async createAccessToken(user: User, minutes?: number): Promise<string> {
    return await this.encryptAccessToken({ id: user.id }, minutes);
  }

  async changePassword({ password, newPassword, username }: ChangePasswordDTO) {
    const user = await this.dataSource.getRepository(User).findOne({
      relations: {
        roles: true
      },
      where: { username }
    });

    if (!user) {
      throw new HttpException({ message: message.userNotFound }, HttpStatus.NOT_FOUND);
    }

    const isCorrectPassword = await this.decryptPassword(password, user.password);

    if (!isCorrectPassword) {
      throw new HttpException({ errorMessage: message.passwordIncorrect }, HttpStatus.BAD_REQUEST);
    }

    user.password = await this.encryptPassword(newPassword, configuration().bcrypt_salt);

    //@TODO: IsActive should be updated through email auth
    if (user.shouldChangePasswordOnNextLogin) {
      user.shouldChangePasswordOnNextLogin = false;
      user.isActive = true;
    }

    await this.dataSource.manager.transaction(async (manager) => await manager.save(user));
  }
}
