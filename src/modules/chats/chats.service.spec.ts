import { PrismaService } from '../../prisma/prisma.service';
import { ChatsService } from './chats.service';

function createPrismaMock() {
  return {
    chat: { upsert: jest.fn().mockResolvedValue({ id: 10n }) },
    chatSettings: { upsert: jest.fn().mockResolvedValue({}) },
  };
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
});
