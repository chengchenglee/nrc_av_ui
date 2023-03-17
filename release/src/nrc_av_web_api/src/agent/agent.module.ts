import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common/utils';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../core';
import { VehicleModule } from '../vehicle/vehicle.module';
import { AgentController } from './agent.controller';
import { AgentGateway } from './agent.gateway';
import { AgentService } from './agent.service';

@Module({
  imports: [forwardRef(() => VehicleModule), DatabaseModule, AuthModule],
  controllers: [AgentController],
  providers: [AgentService, AgentGateway]
})
export class AgentModule {}
