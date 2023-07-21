import { Module } from '@nestjs/common';
import { DestinationModule } from '../destination/destination.module';
import { InterfaceDestinationService } from './interfaceDestination.service';

@Module({
  imports: [DestinationModule],
  providers: [InterfaceDestinationService],
  exports: [InterfaceDestinationService]
})
export class InterfaceDestinationModule {}
