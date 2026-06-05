import type { User as TgUser } from 'telegraf/typings/core/types/typegram';
import { EnsureUserInput } from '../members';
import { Context } from './context.interface';

/** Возвращает аргумент команды (всё после `/command`, без @botname). */
export function commandArg(ctx: Context, command: string): string {
  const message = ctx.message as { text?: string } | undefined;
  const text = message?.text ?? '';
  return text.replace(new RegExp(`^/${command}(@\\w+)?\\s*`, 'i'), '').trim();
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
