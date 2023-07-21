import { Module } from '@nestjs/common';
import { AlgorithmModule } from '../algorithm/algorithm.module';
import { AuthModule } from '../auth/auth.module';
import { CommandModule } from '../command/command.module';
import { InterfaceDestinationModule } from '../interfaceDestination/interfaceDestination.module';
import { MachineModule } from '../machine/machine.module';
import { MultiDestinationModule } from '../multiDestination/multiDestination.module';
import { SensorModule } from '../sensor/sensor.module';
import { InterfaceController } from './interface.controller';
import { InterfaceService } from './interface.service';

@Module({
  imports: [
    AuthModule,
    AlgorithmModule,
    MachineModule,
    CommandModule,
    SensorModule,
    InterfaceDestinationModule,
    MultiDestinationModule
  ],
  providers: [InterfaceService],
  exports: [InterfaceService],
  controllers: [InterfaceController]
})
export class InterfaceModule {}
