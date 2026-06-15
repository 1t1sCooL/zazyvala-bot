import { Telegraf } from 'telegraf';
import { ChatsService } from '../chats';
import { MembersService } from '../members';
import { createActivityMiddleware } from './activity.middleware';

// Регрессия бага «бот отвечает только на /help»: middleware ВСЕГДА вызывает
// next(), даже при ошибке регистрации, иначе хендлеры команд не выполняются.
describe('createActivityMiddleware', () => {
  let chats: { ensureChat: jest.Mock };
  let members: { registerMember: jest.Mock };

  beforeEach(() => {
    chats = { ensureChat: jest.fn().mockResolvedValue({}) };
    members = { registerMember: jest.fn().mockResolvedValue({}) };
  });

  function mw() {
    return createActivityMiddleware(
      chats as unknown as ChatsService,
      members as unknown as MembersService,
    );
  }

  it('registers the author in a group, persists the chat title, and calls next()', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    const ctx = {
      chat: { id: -100, type: 'supergroup', title: 'Моя группа' },
      from: { id: 5, is_bot: false, first_name: 'Иван' },
    };

    await mw()(ctx as never, next);

    expect(chats.ensureChat).toHaveBeenCalledWith({
      id: -100n,
      type: 'supergroup',
      title: 'Моя группа',
    });
    expect(members.registerMember).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() even when registration throws', async () => {
    members.registerMember.mockRejectedValue(new Error('db down'));
    const next = jest.fn().mockResolvedValue(undefined);
    const ctx = {
      chat: { id: -100, type: 'group' },
      from: { id: 5, is_bot: false, first_name: 'Иван' },
    };

    await mw()(ctx as never, next);

    expect(next).toHaveBeenCalledTimes(1); // цепочка команд не блокируется
  });

  it('skips registration in private chat but still calls next()', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    const ctx = {
      chat: { id: 5, type: 'private' },
      from: { id: 5, is_bot: false, first_name: 'Иван' },
    };

    await mw()(ctx as never, next);

    expect(members.registerMember).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  // Реальный прогон через Telegraf (без сети): middleware bot.use не должен
  // блокировать последующий bot.command — это и есть корень бага «только /help».
  it('does not block a later command handler in a real Telegraf chain', async () => {
    const bot = new Telegraf('123:FAKE');
    // Задаём botInfo вручную, чтобы handleUpdate не дёргал getMe (сеть).
    (bot as unknown as { botInfo: unknown }).botInfo = {
      id: 1,
      is_bot: true,
      username: 'test_bot',
      first_name: 'test',
      can_join_groups: true,
      can_read_all_group_messages: true,
      supports_inline_queries: false,
    };
    let called = false;

    bot.use(mw()); // как в options.middlewares
    bot.command('call', async () => {
      called = true;
    });

    await bot.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        chat: { id: -100, type: 'supergroup', title: 'g' },
        from: { id: 5, is_bot: false, first_name: 'Иван' },
        text: '/call',
        entities: [{ type: 'bot_command', offset: 0, length: 5 }],
      },
    } as never);

    expect(called).toBe(true);
    expect(members.registerMember).toHaveBeenCalledTimes(1);
  });
});
