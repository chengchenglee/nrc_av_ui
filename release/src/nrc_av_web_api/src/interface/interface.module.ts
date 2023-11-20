import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheSubSystemModule } from '../cachesubsystem/cachesubsystem.module';
import { CommandModule } from '../command/command.module';
import { InterfaceContentModule } from '../interfaceContent/interfaceContent.module';
import { InterfaceDestinationModule } from '../interfaceDestination/interfaceDestination.module';
import { MachineModule } from '../machine/machine.module';
import { MultiDestinationModule } from '../multiDestination/multiDestination.module';
import { SubSystemModule } from '../subsystem/subsystem.module';
import { TopicModule } from '../topic/topic.module';
import { InterfaceController } from './interface.controller';
import { InterfaceService } from './interface.service';

@Module({
  imports: [
    AuthModule,
    SubSystemModule,
    forwardRef(() => CacheSubSystemModule),
    MachineModule,
    CommandModule,
    TopicModule,
    InterfaceDestinationModule,
    MultiDestinationModule,
    InterfaceContentModule
  ],
  providers: [InterfaceService],
  exports: [InterfaceService],
  controllers: [InterfaceController]
})
export class InterfaceModule {}
