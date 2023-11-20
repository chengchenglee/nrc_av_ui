import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommandModule } from '../command/command.module';
import { TopicModule } from '../topic/topic.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { SubSystemController } from './subsystem.controller';
import { SubSystemService } from './subsystem.service';

@Module({
  imports: [CommandModule, TopicModule, AuthModule, VehicleModule],
  providers: [SubSystemService],
  controllers: [SubSystemController],
  exports: [SubSystemService]
})
export class SubSystemModule {}
