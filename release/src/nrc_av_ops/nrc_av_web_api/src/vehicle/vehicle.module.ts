import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common/utils';
import { AgentModule } from '../agent/agent.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../core/database/database.module';
import { ROSNodeModule } from '../rosNode/rosNode.module';
import { VehicleController } from './vehicle.controller';
import { VehicleGateway } from './vehicle.gateway';
import { VehicleService } from './vehicle.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AgentModule), AuthModule, ROSNodeModule],
  controllers: [VehicleController],
  providers: [VehicleService, VehicleGateway],
  exports: [VehicleService, VehicleGateway]
})
export class VehicleModule {}
