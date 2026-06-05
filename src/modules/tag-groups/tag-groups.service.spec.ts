import { MembersService } from '../members';
import { PrismaService } from '../../prisma/prisma.service';
import { TagGroupsService } from './tag-groups.service';

function createPrismaMock() {
  return {
    tagGroup: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 1, name: 'dev' }),
      deleteMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    tagGroupMember: {
      count: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('TagGroupsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let members: { ensureUser: jest.Mock };
  let service: TagGroupsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    members = { ensureUser: jest.fn().mockResolvedValue({}) };
    service = new TagGroupsService(
      prisma as unknown as PrismaService,
      members as unknown as MembersService,
    );
  });

  it('creates a group with a normalized name', async () => {
    prisma.tagGroup.findUnique.mockResolvedValue(null);
    const res = await service.create(1n, '  Dev ');
    expect(res).toEqual({ status: 'ok' });
    expect(prisma.tagGroup.create).toHaveBeenCalledWith({
      data: { chatId: 1n, name: 'dev' },
    });
  });

  it('returns exists when the group already exists', async () => {
    prisma.tagGroup.findUnique.mockResolvedValue({ id: 1, name: 'dev' });
    expect(await service.create(1n, 'dev')).toEqual({ status: 'exists' });
    expect(prisma.tagGroup.create).not.toHaveBeenCalled();
  });

  it('addMember returns no_group when group is missing', async () => {
    prisma.tagGroup.findUnique.mockResolvedValue(null);
    const res = await service.addMember(1n, 'dev', { id: 2n });
    expect(res).toEqual({ status: 'no_group' });
  });

  it('addMember adds a new user to the group', async () => {
    prisma.tagGroup.findUnique.mockResolvedValue({ id: 7, name: 'dev' });
    prisma.tagGroupMember.count.mockResolvedValue(0);
    const res = await service.addMember(1n, 'dev', { id: 2n });
    expect(res).toEqual({ status: 'ok' });
    expect(members.ensureUser).toHaveBeenCalled();
    expect(prisma.tagGroupMember.create).toHaveBeenCalledWith({
      data: { tagGroupId: 7, userId: 2n },
    });
  });

  it('addMember returns exists for a duplicate', async () => {
    prisma.tagGroup.findUnique.mockResolvedValue({ id: 7, name: 'dev' });
    prisma.tagGroupMember.count.mockResolvedValue(1);
    expect(await service.addMember(1n, 'dev', { id: 2n })).toEqual({
      status: 'exists',
    });
  });

  it('listMembersWithUsers returns null for a missing group', async () => {
    prisma.tagGroup.findUnique.mockResolvedValue(null);
    expect(await service.listMembersWithUsers(1n, 'dev')).toBeNull();
  });

  it('removeMember reports not_member when nothing deleted', async () => {
    prisma.tagGroup.findUnique.mockResolvedValue({ id: 7, name: 'dev' });
    prisma.tagGroupMember.deleteMany.mockResolvedValue({ count: 0 });
    expect(await service.removeMember(1n, 'dev', 2n)).toEqual({
      status: 'not_member',
    });
  });
});
