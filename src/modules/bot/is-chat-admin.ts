import type { Telegram } from 'telegraf';

/** Проверяет, является ли пользователь админом/создателем чата. */
export async function isChatAdmin(
  telegram: Telegram,
  chatId: number,
  userId: number,
): Promise<boolean> {
  try {
    const member = await telegram.getChatMember(chatId, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch {
    return false;
  }
}
