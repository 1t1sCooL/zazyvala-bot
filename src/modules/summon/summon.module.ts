import { Module } from '@nestjs/common';
import { MembersModule } from '../members';
import { SettingsModule } from '../settings';
import { SummonService } from './summon.service';

@Module({
  imports: [MembersModule, SettingsModule],
  providers: [SummonService],
  exports: [SummonService],
})
export class SummonModule {}
