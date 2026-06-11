import { AssistantsService } from '../assistants';
import { MembersService } from '../members';
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
  let members: {
    listPendingUsernames: jest.Mock;
    addByUsername: jest.Mock;
    removePendingByUsername: jest.Mock;
  };
  let service: AdminService;

  beforeEach(() => {
    prisma = createPrismaMock();
    settings = {
      setCooldown: jest.fn().mockResolvedValue(true),
      setHeader: jest.fn().mockResolvedValue(undefined),
      getForChat: jest.fn().mockResolvedValue({ chatId: 1n }),
    };
    assistants = { listWithUsers: jest.fn().mockResolvedValue([]) };
    members = {
      listPendingUsernames: jest.fn().mockResolvedValue([]),
      addByUsername: jest.fn(),
      removePendingByUsername: jest.fn().mockResolvedValue(true),
    };
    service = new AdminService(
      prisma as unknown as PrismaService,
      settings as unknown as SettingsService,
      assistants as unknown as AssistantsService,
      members as unknown as MembersService,
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

  it('addMemberByUsername maps resolved and pending results', async () => {
    members.addByUsername.mockResolvedValue({
      resolved: true,
      member: { userId: 20n },
    });
    expect(await service.addMemberByUsername(1n, '@petrov')).toEqual({
      status: 'member',
      userId: 20n,
    });

    members.addByUsername.mockResolvedValue({
      resolved: false,
      username: 'ghost',
    });
    expect(await service.addMemberByUsername(1n, 'ghost')).toEqual({
      status: 'pending',
      username: 'ghost',
    });
  });

  it('listMembers appends pending usernames', async () => {
    members.listPendingUsernames.mockResolvedValue(['ghost']);

    const list = await service.listMembers(1n);

    expect(list).toEqual([
      expect.objectContaining({
        userId: null,
        name: '@ghost',
        username: 'ghost',
        status: 'pending',
      }),
    ]);
  });
});
