import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService, User } from '../core';
import { LoginDTO } from './dto/loginDTO';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService
  ) {}

  async login(loginDTO: LoginDTO): Promise<string> {
    const user = await this.databaseService.getOneByField(User, 'username', loginDTO.username);

    if (!user) {
      throw new HttpException(
        { errorMessage: 'Username or password is not correct' },
        HttpStatus.BAD_REQUEST
      );
    }

    const isCorrectPassword = await this.decryptPassword(loginDTO.password, user.password);
    if (!isCorrectPassword) {
      throw new HttpException(
        { errorMessage: 'Username or password is not correct' },
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.createAccessToken(user);
  }

  // ---------------------------Bcrypt Service---------------------------
  async encryptPassword(password: string, saltOrRounds: number): Promise<string> {
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
}
