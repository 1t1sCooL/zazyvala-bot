import { AssistantsService } from '../assistants';
import { SettingsService } from '../settings';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminService } from './admin.service';

function createPrismaMock() {
  return {
    chat: { count: jest.fn().mockResolvedValue(3), findMany: jest.fn() },
    user: { count: jest.fn().mockResolvedValue(10) },
    chatMember: {
      count: jest.fn().mockResolvedValue(7),
      findMany: jest.fn().mockResolvedValue([]),
    },
    chatSettings: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { summonsTotal: 42 } }),
    },
  };
}

describe('AdminService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let settings: {
    setCooldown: jest.Mock;
    setHeader: jest.Mock;
    getForChat: jest.Mock;
  };
  let assistants: { listWithUsers: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = createPrismaMock();
    settings = {
      setCooldown: jest.fn().mockResolvedValue(true),
      setHeader: jest.fn().mockResolvedValue(undefined),
      getForChat: jest.fn().mockResolvedValue({ chatId: 1n }),
    };
    assistants = { listWithUsers: jest.fn().mockResolvedValue([]) };
    service = new AdminService(
      prisma as unknown as PrismaService,
      settings as unknown as SettingsService,
      assistants as unknown as AssistantsService,
    );
  });

  it('aggregates global stats', async () => {
    const stats = await service.getStats();
    expect(stats).toEqual({
      chats: 3,
      users: 10,
      activeMembers: 7,
      summonsTotal: 42,
    });
    expect(prisma.chatMember.count).toHaveBeenCalledWith({
      where: { status: 'active' },
    });
  });

  it('maps chats with counts', async () => {
    prisma.chat.findMany.mockResolvedValue([
      {
        id: 1n,
        title: 'A',
        type: 'supergroup',
        settings: { summonsTotal: 5 },
        _count: { members: 4, assistants: 1 },
      },
    ]);

    const list = await service.listChats();
    expect(list).toEqual([
      {
        id: 1n,
        title: 'A',
        type: 'supergroup',
        members: 4,
        assistants: 1,
        summonsTotal: 5,
      },
    ]);
  });

  it('updateSettings applies only provided fields via setters', async () => {
    await service.updateSettings(1n, { cooldownSec: 120 });

    expect(settings.setCooldown).toHaveBeenCalledWith(1n, 120);
    expect(settings.setHeader).not.toHaveBeenCalled();
    expect(settings.getForChat).toHaveBeenCalledWith(1n);
  });
});
