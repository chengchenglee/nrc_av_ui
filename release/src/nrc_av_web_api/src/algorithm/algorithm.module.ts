import { Module } from '@nestjs/common';
import { AlgorithmService } from './algorithm.service';

@Module({
  providers: [AlgorithmService],
  exports: [AlgorithmService]
})
export class AlgorithmModule {}
