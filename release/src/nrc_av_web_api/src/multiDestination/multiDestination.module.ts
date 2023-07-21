import { Module } from '@nestjs/common';
import { DestinationModule } from '../destination/destination.module';
import { MultiDestinationService } from './multiDestination.service';

@Module({
  imports: [DestinationModule],
  providers: [MultiDestinationService],
  exports: [MultiDestinationService]
})
export class MultiDestinationModule {}
