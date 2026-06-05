import { MembersService } from '../members';
import { MetricsService } from '../metrics';
import { SettingsService } from '../settings';
import { TagGroupsService } from '../tag-groups';
import { SummonService } from './summon.service';

function member(id: bigint, firstName: string) {
  return { chatId: 1n, userId: id, user: { id, firstName } };
}

describe('SummonService', () => {
  let members: { listActiveSubscribed: jest.Mock };
  let settings: { getForChat: jest.Mock; touchLastSummon: jest.Mock };
  let tagGroups: { listMembersWithUsers: jest.Mock };
  let telegram: { sendMessage: jest.Mock };
  let service: SummonService;

  beforeEach(() => {
    members = { listActiveSubscribed: jest.fn().mockResolvedValue([]) };
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
    telegram = { sendMessage: jest.fn().mockResolvedValue({}) };
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
  });
});
