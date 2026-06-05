// Публичный API модуля summon — единственная точка входа для других модулей.
export { SummonModule } from './summon.module';
export { SummonService } from './summon.service';
export type { SummonResult } from './summon.service';
export {
  canSummon,
  describePolicy,
  isCallPolicy,
  CALL_POLICIES,
} from './can-summon';
export type { CallPolicy, SummonerRole } from './can-summon';
