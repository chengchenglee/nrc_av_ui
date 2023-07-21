import { Module } from '@nestjs/common';
import { InterfaceModule } from '../interface/interface.module';
import { LoggerModule } from '../logger/logger.module';
import { ModelModule } from '../model/model.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { AgentGateway } from './agent.gateway';

@Module({
  imports: [VehicleModule, InterfaceModule, ModelModule, LoggerModule],
  providers: [AgentGateway],
  exports: [AgentGateway]
})
export class AgentModule {}
