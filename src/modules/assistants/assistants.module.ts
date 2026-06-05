import { Module } from '@nestjs/common';
import { AssistantsService } from './assistants.service';

@Module({
  providers: [AssistantsService],
  exports: [AssistantsService],
})
export class AssistantsModule {}
