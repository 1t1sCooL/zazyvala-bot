import { ChatsService } from '../chats';
import { MembersService } from '../members';
import { MembershipUpdate } from './membership.update';

// Регрессия: onMessage ОБЯЗАН вызывать next(), иначе хендлеры команд
// (/call, /join, ...) не выполняются и бот отвечает только на /start, /help.
describe('MembershipUpdate.onMessage', () => {
  let chats: { ensureChat: jest.Mock };
  let members: { registerMember: jest.Mock };
  let update: MembershipUpdate;

  beforeEach(() => {
    chats = { ensureChat: jest.fn().mockResolvedValue({}) };
    members = { registerMember: jest.fn().mockResolvedValue({}) };
    update = new MembershipUpdate(
      chats as unknown as ChatsService,
      members as unknown as MembersService,
    );
  });

  it('registers the author and calls next() in a group chat', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    const ctx = {
      chat: { id: -100, type: 'supergroup' },
      from: { id: 5, is_bot: false, first_name: 'Иван' },
    };

    await update.onMessage(ctx as never, next);

    expect(members.registerMember).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('still calls next() in a private chat without registering', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    const ctx = {
      chat: { id: 5, type: 'private' },
      from: { id: 5, is_bot: false, first_name: 'Иван' },
    };

    await update.onMessage(ctx as never, next);

    expect(members.registerMember).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
