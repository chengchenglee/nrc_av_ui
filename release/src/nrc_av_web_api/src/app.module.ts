import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AgentModule } from './agent/agent.module';
import { AlgorithmModule } from './algorithm/algorithm.module';
import { AuthModule } from './auth/auth.module';
import { CommandModule } from './command/command.module';
import { configuration, DbModule } from './config';
import { DestinationModule } from './destination/destination.module';
import { InterfaceModule } from './interface/interface.module';
import { InterfaceDestinationModule } from './interfaceDestination/interfaceDestination.module';
import { LoggerModule } from './logger/logger.module';
import { MachineModule } from './machine/machine.module';
import { ModelModule } from './model/model.module';
import { MultiDestinationModule } from './multiDestination/multiDestination.module';
import { SensorModule } from './sensor/sensor.module';
import { UserModule } from './user/user.module';
import { VehicleModule } from './vehicle/vehicle.module';

@Module({
  imports: [
    AgentModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [configuration],
      isGlobal: true
    }),
    DbModule,
    VehicleModule,
    AuthModule,
    UserModule,
    EventEmitterModule.forRoot({
      maxListeners: 0
    }),
    InterfaceModule,
    AlgorithmModule,
    MachineModule,
    CommandModule,
    SensorModule,
    DestinationModule,
    InterfaceDestinationModule,
    MultiDestinationModule,
    LoggerModule,
    ModelModule
  ]
})
export class AppModule {}
