import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Vehicle,
  Model,
  User,
  Machine,
  SubSystem,
  Topic,
  Interface,
  Destination,
  InterfaceDestination,
  MultiDestination,
  Command,
  Node,
  InterfaceContent,
  Role,
  Permission
} from '../core';
import { CacheSubSystem } from '../core/models/cache_subsystem';

export const DbModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('database.host'),
    port: Number(configService.get('database.port')),
    username: configService.get('database.username'),
    password: configService.get('database.password'),
    database: configService.get('database.name'),
    entities: [
      Vehicle,
      Model,
      User,
      Machine,
      SubSystem,
      Topic,
      Interface,
      Destination,
      InterfaceDestination,
      MultiDestination,
      Command,
      CacheSubSystem,
      Node,
      InterfaceContent,
      Role,
      Permission
    ]
  }),
  inject: [ConfigService]
});
