import { Module } from '@nestjs/common';
import { DatabaseModule } from '../core';
import { ROSNodesController } from './rosNode.controller';
import { ROSNodeService } from './rosNode.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ROSNodesController],
  providers: [ROSNodeService],
  exports: [ROSNodeService]
})
export class ROSNodeModule {}
