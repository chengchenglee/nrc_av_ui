import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  imports: [AuthModule],
  providers: [RoleService],
  exports: [RoleService],
  controllers: [RoleController]
})
export class RoleModule {}
