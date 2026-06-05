import { MembersService } from '../members';
import { SettingsService } from '../settings';
import { SummonService } from './summon.service';

function member(id: bigint, firstName: string) {
  return { chatId: 1n, userId: id, user: { id, firstName } };
}

describe('SummonService', () => {
  let members: { listActiveSubscribed: jest.Mock };
  let settings: { getForChat: jest.Mock; touchLastSummon: jest.Mock };
  let telegram: { sendMessage: jest.Mock };
  let service: SummonService;

  beforeEach(() => {
    members = { listActiveSubscribed: jest.fn() };
    settings = {
      getForChat: jest.fn(),
      touchLastSummon: jest.fn().mockResolvedValue(undefined),
    };
    telegram = { sendMessage: jest.fn().mockResolvedValue({}) };
    service = new SummonService(
      members as unknown as MembersService,
      settings as unknown as SettingsService,
    );
  });

  it('summons active members in one batch and records lastSummon', async () => {
    settings.getForChat.mockResolvedValue({
      header: 'Зов!',
      mentionsPerBatch: 5,
      cooldownSec: 60,
      lastSummonAt: null,
    });
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
    expect(settings.touchLastSummon).not.toHaveBeenCalled();
  });

  it('returns empty when there are no subscribed members', async () => {
    settings.getForChat.mockResolvedValue({
      header: null,
      mentionsPerBatch: 5,
      cooldownSec: 60,
      lastSummonAt: null,
    });
    members.listActiveSubscribed.mockResolvedValue([]);

    const result = await service.callAll(1n, telegram as never);

    expect(result).toEqual({ status: 'empty' });
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});
