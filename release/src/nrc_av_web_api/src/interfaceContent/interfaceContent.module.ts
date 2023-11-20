import { Module } from '@nestjs/common';
import { InterfaceContentService } from './interfaceContent.service';

@Module({
  imports: [],
  providers: [InterfaceContentService],
  exports: [InterfaceContentService]
})
export class InterfaceContentModule {}
