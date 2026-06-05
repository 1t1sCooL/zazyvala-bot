interface NameParts {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

/**
 * Отображаемое имя: «Имя Фамилия», иначе @username, иначе fallback.
 */
export function displayName(p: NameParts, fallback = 'участник'): string {
  const full = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (p.username) return `@${p.username}`;
  return fallback;
}

/** Версия для Telegram-пользователя (snake_case поля). */
export function tgDisplayName(u: {
  first_name?: string;
  last_name?: string;
  username?: string;
  id: number;
}): string {
  return displayName(
    { firstName: u.first_name, lastName: u.last_name, username: u.username },
    `id ${u.id}`,
  );
}
