import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule/dist';
import { AgentModule } from './agent/agent.module';
import { AuthModule } from './auth/auth.module';
import { configuration, DbModule } from './config';
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
    ScheduleModule.forRoot(),
    DbModule,
    VehicleModule,
    AuthModule,
    UserModule
  ]
})
export class AppModule {}
