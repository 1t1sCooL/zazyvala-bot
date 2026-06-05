import { PrismaService } from '../../prisma/prisma.service';
import { MembersService } from './members.service';

function createPrismaMock() {
  return {
    user: { upsert: jest.fn().mockResolvedValue({}) },
    chatMember: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('MembersService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: MembersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new MembersService(prisma as unknown as PrismaService);
  });

  it('registerMember ensures user and upserts an active membership', async () => {
    await service.registerMember(10n, { id: 20n, firstName: 'Иван' });

    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.chatMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { chatId_userId: { chatId: 10n, userId: 20n } },
        update: { status: 'active', leftAt: null },
        create: expect.objectContaining({
          chatId: 10n,
          userId: 20n,
          status: 'active',
          subscribed: true,
        }),
      }),
    );
  });

  it('markLeft sets status to left for the membership', async () => {
    await service.markLeft(10n, 20n);

    expect(prisma.chatMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { chatId: 10n, userId: 20n },
        data: expect.objectContaining({ status: 'left' }),
      }),
    );
  });

  it('setSubscribed updates the subscribed flag', async () => {
    await service.setSubscribed(10n, { id: 20n }, false);

    expect(prisma.chatMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ subscribed: false }),
        create: expect.objectContaining({ subscribed: false }),
      }),
    );
  });

  it('listActiveSubscribed filters by status, subscription and blacklist', async () => {
    await service.listActiveSubscribed(10n);

    expect(prisma.chatMember.findMany).toHaveBeenCalledWith({
      where: {
        chatId: 10n,
        status: 'active',
        subscribed: true,
        blacklisted: false,
      },
      include: { user: true },
    });
  });

  it('setBlacklisted ensures user and upserts the flag', async () => {
    await service.setBlacklisted(10n, { id: 20n }, true);

    expect(prisma.user.upsert).toHaveBeenCalled();
    expect(prisma.chatMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { blacklisted: true },
        create: expect.objectContaining({ blacklisted: true }),
      }),
    );
  });
});
