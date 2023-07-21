import { Module } from '@nestjs/common';
import { MachineService } from './machine.service';

@Module({
  providers: [MachineService],
  exports: [MachineService]
})
export class MachineModule {}
