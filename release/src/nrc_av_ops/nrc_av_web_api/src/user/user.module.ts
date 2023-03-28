import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../core';
import { UserController } from './user.controller';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [UserController]
})
export class UserModule {}
