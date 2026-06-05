// Публичный API модуля assistants — единственная точка входа для других модулей.
export { AssistantsModule } from './assistants.module';
export {
  AssistantsService,
  MAX_ASSISTANTS_PER_CHAT,
} from './assistants.service';
export type {
  AddResult,
  RemoveResult,
  AssistantWithUser,
} from './assistants.service';
