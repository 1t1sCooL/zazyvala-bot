export const CALL_POLICIES = ['all', 'assistants', 'admins'] as const;
export type CallPolicy = (typeof CALL_POLICIES)[number];

export function isCallPolicy(value: string): value is CallPolicy {
  return (CALL_POLICIES as readonly string[]).includes(value);
}

export interface SummonerRole {
  isAdmin: boolean;
  isAssistant: boolean;
}

/**
 * Решает, может ли пользователь инициировать зов при заданной политике чата.
 * Админы могут звать при любой политике, кроме явного ограничения нет.
 */
export function canSummon(policy: string, role: SummonerRole): boolean {
  switch (policy) {
    case 'admins':
      return role.isAdmin;
    case 'assistants':
      return role.isAdmin || role.isAssistant;
    case 'all':
    default:
      return true;
  }
}

/** Человекочитаемое описание политики (для ответов бота). */
export function describePolicy(policy: string): string {
  switch (policy) {
    case 'admins':
      return 'только администраторы';
    case 'assistants':
      return 'администраторы и помощники';
    case 'all':
    default:
      return 'все участники';
  }
}
