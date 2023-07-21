import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common/utils';
import { AgentModule } from '../agent/agent.module';
import { AuthModule } from '../auth/auth.module';
import { CommandModule } from '../command/command.module';
import { InterfaceModule } from '../interface/interface.module';
import { LoggerModule } from '../logger/logger.module';
import { ModelModule } from '../model/model.module';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';

@Module({
  imports: [
    forwardRef(() => AgentModule),
    AuthModule,
    InterfaceModule,
    CommandModule,
    LoggerModule,
    ModelModule
  ],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService]
})
export class VehicleModule {}
