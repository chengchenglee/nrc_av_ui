import { Module, forwardRef } from '@nestjs/common';
import { InterfaceModule } from '../interface/interface.module';
import { CacheSubSystemService } from './cachesubsystem.service';

@Module({
  imports: [forwardRef(() => InterfaceModule)],
  providers: [CacheSubSystemService],
  exports: [CacheSubSystemService]
})
export class CacheSubSystemModule {}
