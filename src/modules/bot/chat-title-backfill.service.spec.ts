import { Telegraf } from 'telegraf';
import { ChatsService } from '../chats';
import { Context } from './context.interface';
import { ChatTitleBackfillService } from './chat-title-backfill.service';

describe('ChatTitleBackfillService', () => {
  let getChat: jest.Mock;
  let bot: { telegram: { getChat: jest.Mock } };
  let chats: { listIdsWithoutTitle: jest.Mock; setTitle: jest.Mock };

  function service() {
    return new ChatTitleBackfillService(
      bot as unknown as Telegraf<Context>,
      chats as unknown as ChatsService,
    );
  }

  beforeEach(() => {
    getChat = jest.fn();
    bot = { telegram: { getChat } };
    chats = {
      listIdsWithoutTitle: jest.fn().mockResolvedValue([]),
      setTitle: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('does nothing when every chat already has a title', async () => {
    chats.listIdsWithoutTitle.mockResolvedValue([]);

    await service().onModuleInit();

    expect(getChat).not.toHaveBeenCalled();
    expect(chats.setTitle).not.toHaveBeenCalled();
  });

  it('fetches and persists the title for chats missing a name', async () => {
    chats.listIdsWithoutTitle.mockResolvedValue([-10n]);
    getChat.mockResolvedValue({ id: -10, type: 'supergroup', title: 'Группа' });

    await service().onModuleInit();

    expect(getChat).toHaveBeenCalledWith(-10);
    expect(chats.setTitle).toHaveBeenCalledWith(-10n, 'Группа');
  });

  it('skips a chat without a title field (e.g. private) without persisting', async () => {
    chats.listIdsWithoutTitle.mockResolvedValue([5n]);
    getChat.mockResolvedValue({ id: 5, type: 'private' });

    await service().onModuleInit();

    expect(chats.setTitle).not.toHaveBeenCalled();
  });

  it('continues when getChat throws (bot removed) and does not crash startup', async () => {
    chats.listIdsWithoutTitle.mockResolvedValue([-10n, -20n]);
    getChat
      .mockRejectedValueOnce(new Error('chat not found'))
      .mockResolvedValueOnce({ id: -20, type: 'group', title: 'Вторая' });

    await expect(service().onModuleInit()).resolves.toBeUndefined();

    expect(chats.setTitle).toHaveBeenCalledTimes(1);
    expect(chats.setTitle).toHaveBeenCalledWith(-20n, 'Вторая');
  });
});
