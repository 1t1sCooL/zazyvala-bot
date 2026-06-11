// Публичный API модуля members — единственная точка входа для других модулей.
export { MembersModule } from './members.module';
export { MembersService, normalizeUsername } from './members.service';
export type {
  EnsureUserInput,
  ChatMemberWithUser,
  AddByUsernameResult,
} from './members.service';
