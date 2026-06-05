import { Module } from '@nestjs/common';
import { MembersModule } from '../members';
import { TagGroupsService } from './tag-groups.service';

@Module({
  imports: [MembersModule],
  providers: [TagGroupsService],
  exports: [TagGroupsService],
})
export class TagGroupsModule {}
