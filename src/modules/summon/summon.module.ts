import { Module } from '@nestjs/common';
import { MembersModule } from '../members';
import { SettingsModule } from '../settings';
import { TagGroupsModule } from '../tag-groups';
import { SummonService } from './summon.service';

@Module({
  imports: [MembersModule, SettingsModule, TagGroupsModule],
  providers: [SummonService],
  exports: [SummonService],
})
export class SummonModule {}
