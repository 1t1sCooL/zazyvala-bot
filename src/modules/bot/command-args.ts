import type { User as TgUser } from 'telegraf/typings/core/types/typegram';
import { t } from '../i18n';
import { EnsureUserInput } from '../members';
import { Context } from './context.interface';

/** Возвращает аргумент команды (всё после `/command`, без @botname). */
export function commandArg(ctx: Context, command: string): string {
  const message = ctx.message as { text?: string } | undefined;
  const text = message?.text ?? '';
  return text.replace(new RegExp(`^/${command}(@\\w+)?\\s*`, 'i'), '').trim();
}

/** Только для групп. Иначе отвечает подсказкой и возвращает false. */
export async function requireGroup(ctx: Context): Promise<boolean> {
  const type = ctx.chat?.type;
  if (type === 'group' || type === 'supergroup') return true;
  await ctx.reply(t('ru', 'group_only_hint'));
  return false;
}

/** Пользователь из сообщения, на которое ответили командой (или undefined). */
export function replyTarget(ctx: Context): TgUser | undefined {
  const message = ctx.message as
    | { reply_to_message?: { from?: TgUser } }
    | undefined;
  return message?.reply_to_message?.from;
}

/** Преобразует Telegram-пользователя в вход для MembersService.ensureUser. */
export function fromUserInput(user: TgUser): EnsureUserInput {
  return {
    id: BigInt(user.id),
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    isBot: user.is_bot,
  };
}
