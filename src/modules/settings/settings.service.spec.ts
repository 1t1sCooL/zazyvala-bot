import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from './settings.service';

function createPrismaMock() {
  return {
    chatSettings: {
      upsert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('SettingsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SettingsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SettingsService(prisma as unknown as PrismaService);
  });

  describe('setCooldown', () => {
    it('accepts a valid value', async () => {
      expect(await service.setCooldown(1n, 60)).toBe(true);
      expect(prisma.chatSettings.upsert).toHaveBeenCalled();
    });

    it('rejects negative, too large, or non-integer values', async () => {
      expect(await service.setCooldown(1n, -1)).toBe(false);
      expect(await service.setCooldown(1n, 999999)).toBe(false);
      expect(await service.setCooldown(1n, 1.5)).toBe(false);
      expect(await service.setCooldown(1n, NaN)).toBe(false);
      expect(prisma.chatSettings.upsert).not.toHaveBeenCalled();
    });
  });

  describe('setMentionsPerBatch', () => {
    it('accepts 1..10', async () => {
      expect(await service.setMentionsPerBatch(1n, 5)).toBe(true);
    });

    it('rejects out-of-range values', async () => {
      expect(await service.setMentionsPerBatch(1n, 0)).toBe(false);
      expect(await service.setMentionsPerBatch(1n, 11)).toBe(false);
      expect(prisma.chatSettings.upsert).not.toHaveBeenCalled();
    });
  });
});
