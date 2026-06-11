import { PrismaService } from '../../prisma/prisma.service';
import { ChatsService } from './chats.service';

function createPrismaMock() {
  const prisma = {
    chat: {
      upsert: jest.fn().mockResolvedValue({ id: 10n }),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    chatSettings: { upsert: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(
      async (cb: (tx: unknown) => Promise<unknown>): Promise<unknown> =>
        cb(prisma),
    ),
  };
  return prisma;
}

describe('ChatsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ChatsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ChatsService(prisma as unknown as PrismaService);
  });

  it('ensureChat upserts the chat and its default settings', async () => {
    await service.ensureChat({ id: 10n, type: 'supergroup' });

    expect(prisma.chat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10n } }),
    );
    expect(prisma.chatSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { chatId: 10n },
        create: { chatId: 10n },
      }),
    );
  });

  describe('migrateChat', () => {
    it('moves the chat to the new id (registry follows via FK cascade)', async () => {
      prisma.chat.findUnique.mockImplementation(({ where }: never) =>
        Promise.resolve(
          (where as { id: bigint }).id === -10n ? { id: -10n } : null,
        ),
      );

      await service.migrateChat(-10n, -100n);

      expect(prisma.chat.delete).not.toHaveBeenCalled();
      expect(prisma.chat.update).toHaveBeenCalledWith({
        where: { id: -10n },
        data: { id: -100n, type: 'supergroup' },
      });
    });

    it('removes an auto-created stub under the new id before migrating', async () => {
      prisma.chat.findUnique.mockResolvedValue({ id: 1n }); // и старый, и стаб

      await service.migrateChat(-10n, -100n);

      expect(prisma.chat.delete).toHaveBeenCalledWith({ where: { id: -100n } });
      expect(prisma.chat.update).toHaveBeenCalledWith({
        where: { id: -10n },
        data: { id: -100n, type: 'supergroup' },
      });
    });

    it('does nothing when the old chat is unknown', async () => {
      prisma.chat.findUnique.mockResolvedValue(null);

      await service.migrateChat(-10n, -100n);

      expect(prisma.chat.update).not.toHaveBeenCalled();
      expect(prisma.chat.delete).not.toHaveBeenCalled();
    });
  });
});
