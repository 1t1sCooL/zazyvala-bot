import { MembersService } from '../members';
import { MetricsService } from '../metrics';
import { SettingsService } from '../settings';
import { TagGroupsService } from '../tag-groups';
import { SummonService } from './summon.service';

function member(id: bigint, firstName: string) {
  return { chatId: 1n, userId: id, user: { id, firstName } };
}

describe('SummonService', () => {
  let members: {
    listActiveSubscribed: jest.Mock;
    registerMember: jest.Mock;
    resolvePending: jest.Mock;
    listPendingUsernames: jest.Mock;
  };
  let settings: { getForChat: jest.Mock; touchLastSummon: jest.Mock };
  let tagGroups: { listMembersWithUsers: jest.Mock };
  let telegram: {
    sendMessage: jest.Mock;
    getChatAdministrators: jest.Mock;
    getChatMembersCount: jest.Mock;
  };
  let service: SummonService;

  beforeEach(() => {
    members = {
      listActiveSubscribed: jest.fn().mockResolvedValue([]),
      registerMember: jest.fn().mockResolvedValue({}),
      resolvePending: jest.fn().mockResolvedValue(undefined),
      listPendingUsernames: jest.fn().mockResolvedValue([]),
    };
    settings = {
      getForChat: jest.fn().mockResolvedValue({
        header: null,
        mentionsPerBatch: 5,
        cooldownSec: 60,
        lastSummonAt: null,
      }),
      touchLastSummon: jest.fn().mockResolvedValue(undefined),
    };
    tagGroups = { listMembersWithUsers: jest.fn() };
    telegram = {
      sendMessage: jest.fn().mockResolvedValue({}),
      getChatAdministrators: jest.fn().mockResolvedValue([]),
      // 2 человека + сам бот: полное покрытие в базовых тестах
      getChatMembersCount: jest.fn().mockResolvedValue(3),
    };
    const metrics = { incSummons: jest.fn() };
    service = new SummonService(
      members as unknown as MembersService,
      settings as unknown as SettingsService,
      tagGroups as unknown as TagGroupsService,
      metrics as unknown as MetricsService,
    );
  });

  describe('callAll', () => {
    it('summons active members in one batch and records lastSummon', async () => {
      members.listActiveSubscribed.mockResolvedValue([
        member(10n, 'Иван'),
        member(20n, 'Пётр'),
      ]);

      const result = await service.callAll(1n, telegram as never);

      expect(result).toEqual({ status: 'ok', notified: 2, batches: 1 });
      expect(telegram.sendMessage).toHaveBeenCalledTimes(1);
      expect(settings.touchLastSummon).toHaveBeenCalledWith(1n);
    });

    it('returns cooldown when called too soon', async () => {
      settings.getForChat.mockResolvedValue({
        header: null,
        mentionsPerBatch: 5,
        cooldownSec: 60,
        lastSummonAt: new Date(),
      });

      const result = await service.callAll(1n, telegram as never);

      expect(result.status).toBe('cooldown');
      expect(telegram.sendMessage).not.toHaveBeenCalled();
    });

    it('returns empty when there are no subscribed members', async () => {
      members.listActiveSubscribed.mockResolvedValue([]);
      expect(await service.callAll(1n, telegram as never)).toEqual({
        status: 'empty',
      });
    });

    it('registers non-bot chat admins in the registry before summoning', async () => {
      telegram.getChatAdministrators.mockResolvedValue([
        { user: { id: 30, is_bot: false, first_name: 'Админ' } },
        { user: { id: 99, is_bot: true, first_name: 'SomeBot' } },
      ]);
      members.listActiveSubscribed.mockResolvedValue([member(10n, 'Иван')]);

      await service.callAll(1n, telegram as never);

      expect(members.registerMember).toHaveBeenCalledTimes(1);
      expect(members.registerMember).toHaveBeenCalledWith(
        1n,
        expect.objectContaining({ id: 30n, isBot: false }),
      );
      // Список к зову берётся после подкачки админов
      expect(members.registerMember.mock.invocationCallOrder[0]).toBeLessThan(
        members.listActiveSubscribed.mock.invocationCallOrder[0],
      );
    });

    it('reports missing members when the registry covers few chat members', async () => {
      members.listActiveSubscribed.mockResolvedValue([member(10n, 'Иван')]);
      telegram.getChatMembersCount.mockResolvedValue(201); // 200 людей + бот

      const result = await service.callAll(1n, telegram as never);

      expect(result).toEqual({
        status: 'ok',
        notified: 1,
        batches: 1,
        missing: 199,
      });
    });

    it('omits missing when coverage is high enough', async () => {
      members.listActiveSubscribed.mockResolvedValue([
        member(10n, 'Иван'),
        member(20n, 'Пётр'),
      ]);
      telegram.getChatMembersCount.mockResolvedValue(3); // все позваны

      const result = await service.callAll(1n, telegram as never);

      expect(result).toEqual({ status: 'ok', notified: 2, batches: 1 });
    });

    it('includes pending @usernames in the summon after resolving them', async () => {
      members.listActiveSubscribed.mockResolvedValue([member(10n, 'Иван')]);
      members.listPendingUsernames.mockResolvedValue(['petrov']);
      telegram.getChatMembersCount.mockResolvedValue(3);

      const result = await service.callAll(1n, telegram as never);

      expect(members.resolvePending).toHaveBeenCalledWith(1n);
      expect(result).toEqual({ status: 'ok', notified: 2, batches: 1 });
      const [, text] = telegram.sendMessage.mock.calls[0] as [number, string];
      expect(text).toBe('Иван, @petrov');
    });

    it('sends summon batches into the forum topic when threadId is given', async () => {
      members.listActiveSubscribed.mockResolvedValue([member(10n, 'Иван')]);

      await service.callAll(1n, telegram as never, undefined, 42);

      expect(telegram.sendMessage).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({ message_thread_id: 42 }),
      );
    });

    it('sends without a topic when threadId is absent', async () => {
      members.listActiveSubscribed.mockResolvedValue([member(10n, 'Иван')]);

      await service.callAll(1n, telegram as never);

      expect(telegram.sendMessage).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({ message_thread_id: undefined }),
      );
    });

    it('still summons when admin sync or member count fails', async () => {
      telegram.getChatAdministrators.mockRejectedValue(new Error('403'));
      telegram.getChatMembersCount.mockRejectedValue(new Error('403'));
      members.listActiveSubscribed.mockResolvedValue([member(10n, 'Иван')]);

      const result = await service.callAll(1n, telegram as never);

      expect(result).toEqual({ status: 'ok', notified: 1, batches: 1 });
      expect(telegram.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('callGroup', () => {
    it('returns no_group when the group does not exist', async () => {
      tagGroups.listMembersWithUsers.mockResolvedValue(null);
      expect(await service.callGroup(1n, telegram as never, 'dev')).toEqual({
        status: 'no_group',
      });
    });

    it('returns empty for an empty group', async () => {
      tagGroups.listMembersWithUsers.mockResolvedValue([]);
      expect(await service.callGroup(1n, telegram as never, 'dev')).toEqual({
        status: 'empty',
      });
    });

    it('summons group members', async () => {
      tagGroups.listMembersWithUsers.mockResolvedValue([
        { userId: 10n, user: { id: 10n, firstName: 'Иван' } },
        { userId: 20n, user: null },
      ]);

      const result = await service.callGroup(1n, telegram as never, 'dev');

      expect(result).toEqual({ status: 'ok', notified: 2, batches: 1 });
      expect(telegram.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('sends group summon into the forum topic when threadId is given', async () => {
      tagGroups.listMembersWithUsers.mockResolvedValue([
        { userId: 10n, user: { id: 10n, firstName: 'Иван' } },
      ]);

      await service.callGroup(1n, telegram as never, 'dev', undefined, 42);

      expect(telegram.sendMessage).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({ message_thread_id: 42 }),
      );
    });
  });
});
