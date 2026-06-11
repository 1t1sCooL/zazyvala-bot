import { PrismaService } from '../../prisma/prisma.service';
import { MembersService, normalizeUsername } from './members.service';

function createPrismaMock() {
  return {
    user: {
      upsert: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    chatMember: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    pendingMember: {
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
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

  describe('username-based members', () => {
    it('normalizeUsername strips @, lowercases and validates', () => {
      expect(normalizeUsername('@Ivan_Petrov')).toBe('ivan_petrov');
      expect(normalizeUsername(' petrov99 ')).toBe('petrov99');
      expect(normalizeUsername('@bad name')).toBeNull();
      expect(normalizeUsername('a')).toBeNull();
    });

    it('addByUsername registers a full member when the user is already known', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 20n,
        username: 'petrov',
        firstName: 'Пётр',
      });

      const result = await service.addByUsername(10n, '@Petrov');

      expect(result.resolved).toBe(true);
      expect(prisma.chatMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chatId_userId: { chatId: 10n, userId: 20n } },
        }),
      );
      expect(prisma.pendingMember.upsert).not.toHaveBeenCalled();
    });

    it('addByUsername stores a pending record for an unknown user', async () => {
      const result = await service.addByUsername(10n, '@NewGuy_77');

      expect(result).toEqual({ resolved: false, username: 'newguy_77' });
      expect(prisma.pendingMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chatId_username: { chatId: 10n, username: 'newguy_77' } },
        }),
      );
      expect(prisma.chatMember.upsert).not.toHaveBeenCalled();
    });

    it('registerMember claims a pending record by username', async () => {
      prisma.pendingMember.deleteMany.mockResolvedValue({ count: 1 });

      await service.registerMember(10n, {
        id: 20n,
        username: 'Petrov',
        firstName: 'Пётр',
      });

      expect(prisma.pendingMember.deleteMany).toHaveBeenCalledWith({
        where: { chatId: 10n, username: 'petrov' },
      });
    });

    it('resolvePending converts pending records of known users', async () => {
      prisma.pendingMember.findMany.mockResolvedValue([
        { chatId: 10n, username: 'petrov' },
        { chatId: 10n, username: 'ghost' },
      ]);
      prisma.user.findFirst.mockImplementation(({ where }: never) =>
        Promise.resolve(
          (where as { username: { equals: string } }).username.equals ===
            'petrov'
            ? { id: 20n, username: 'petrov', firstName: 'Пётр' }
            : null,
        ),
      );

      await service.resolvePending(10n);

      expect(prisma.chatMember.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.chatMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chatId_userId: { chatId: 10n, userId: 20n } },
        }),
      );
    });

    it('listPendingUsernames returns usernames in insertion order', async () => {
      prisma.pendingMember.findMany.mockResolvedValue([
        { chatId: 10n, username: 'first' },
        { chatId: 10n, username: 'second' },
      ]);

      expect(await service.listPendingUsernames(10n)).toEqual([
        'first',
        'second',
      ]);
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
