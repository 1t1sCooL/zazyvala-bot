// Публичный API модуля tag-groups — единственная точка входа для других модулей.
export { TagGroupsModule } from './tag-groups.module';
export { TagGroupsService, normalizeGroupName } from './tag-groups.service';
export type {
  CreateResult,
  RemoveResult,
  AddMemberResult,
  RemoveMemberResult,
  TagGroupSummary,
  TagGroupMemberWithUser,
} from './tag-groups.service';
