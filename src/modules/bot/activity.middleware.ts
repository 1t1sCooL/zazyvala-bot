import { Logger } from '@nestjs/common';
import { ChatsService } from '../chats';
import { MembersService } from '../members';
import { fromUserInput } from './command-args';
import { Context } from './context.interface';

type Next = () => Promise<unknown>;

/**
 * Сквозной middleware авто-регистрации участников по активности.
 *
 * Регистрируется через options.middlewares (bot.use) ДО хендлеров команд и
 * ВСЕГДА вызывает next() — поэтому никогда не блокирует /call и другие команды.
 * Ошибки регистрации изолированы try/catch, чтобы сбой БД не рвал цепочку.
 */
export function createActivityMiddleware(
  chats: ChatsService,
  members: MembersService,
): (ctx: Context, next: Next) => Promise<unknown> {
  const logger = new Logger('ActivityMiddleware');

  return async (ctx: Context, next: Next) => {
    const chat = ctx.chat;
    const from = ctx.from;
    const isGroup = chat?.type === 'group' || chat?.type === 'supergroup';

    if (chat && from && !from.is_bot && isGroup) {
      try {
        await chats.ensureChat({ id: BigInt(chat.id), type: chat.type });
        await members.registerMember(BigInt(chat.id), fromUserInput(from));
      } catch (err) {
        logger.error(
          `activity registration failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return next();
  };
}
