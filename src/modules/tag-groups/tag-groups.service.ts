import { Injectable, Logger } from '@nestjs/common';
import { TagGroup, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EnsureUserInput, MembersService } from '../members';

export type CreateResult = { status: 'ok' } | { status: 'exists' };
export type RemoveResult = { status: 'ok' } | { status: 'not_found' };
export type AddMemberResult =
  | { status: 'ok' }
  | { status: 'exists' }
  | { status: 'no_group' };
export type RemoveMemberResult =
  | { status: 'ok' }
  | { status: 'not_member' }
  | { status: 'no_group' };

export interface TagGroupSummary {
  name: string;
  count: number;
}

export interface TagGroupMemberWithUser {
  userId: bigint;
  user: User | null;
}

/** Нормализует имя группы: trim + lowercase. */
export function normalizeGroupName(name: string): string {
  return name.trim().toLowerCase();
}

@Injectable()
export class TagGroupsService {
  private readonly logger = new Logger(TagGroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
  ) {}

  async findByName(chatId: bigint, name: string): Promise<TagGroup | null> {
    return this.prisma.tagGroup.findUnique({
      where: { chatId_name: { chatId, name: normalizeGroupName(name) } },
    });
  }

  async create(chatId: bigint, name: string): Promise<CreateResult> {
    const normalized = normalizeGroupName(name);
    if (await this.findByName(chatId, normalized)) {
      return { status: 'exists' };
    }
    await this.prisma.tagGroup.create({
      data: { chatId, name: normalized },
    });
    this.logger.debug(`Created tag group "${normalized}" in chat ${chatId}`);
    return { status: 'ok' };
  }

  async remove(chatId: bigint, name: string): Promise<RemoveResult> {
    const { count } = await this.prisma.tagGroup.deleteMany({
      where: { chatId, name: normalizeGroupName(name) },
    });
    this.logger.debug(`Removed tag group "${name}" in chat ${chatId}`);
    return count > 0 ? { status: 'ok' } : { status: 'not_found' };
  }

  async list(chatId: bigint): Promise<TagGroupSummary[]> {
    const groups = await this.prisma.tagGroup.findMany({
      where: { chatId },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    });
    return groups.map((g) => ({ name: g.name, count: g._count.members }));
  }

  async addMember(
    chatId: bigint,
    name: string,
    user: EnsureUserInput,
  ): Promise<AddMemberResult> {
    const group = await this.findByName(chatId, name);
    if (!group) return { status: 'no_group' };

    await this.members.ensureUser(user);

    const existing = await this.prisma.tagGroupMember.count({
      where: { tagGroupId: group.id, userId: user.id },
    });
    if (existing > 0) return { status: 'exists' };

    await this.prisma.tagGroupMember.create({
      data: { tagGroupId: group.id, userId: user.id },
    });
    this.logger.debug(
      `Added ${user.id} to tag group "${group.name}" in chat ${chatId}`,
    );
    return { status: 'ok' };
  }

  async removeMember(
    chatId: bigint,
    name: string,
    userId: bigint,
  ): Promise<RemoveMemberResult> {
    const group = await this.findByName(chatId, name);
    if (!group) return { status: 'no_group' };

    const { count } = await this.prisma.tagGroupMember.deleteMany({
      where: { tagGroupId: group.id, userId },
    });
    this.logger.debug(
      `Removed ${userId} from tag group "${group.name}" in chat ${chatId}`,
    );
    return count > 0 ? { status: 'ok' } : { status: 'not_member' };
  }

  /** Участники группы с подтянутыми User. null — если группы нет. */
  async listMembersWithUsers(
    chatId: bigint,
    name: string,
  ): Promise<TagGroupMemberWithUser[] | null> {
    const group = await this.findByName(chatId, name);
    if (!group) return null;

    const members = await this.prisma.tagGroupMember.findMany({
      where: { tagGroupId: group.id },
    });
    if (members.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return members.map((m) => ({
      userId: m.userId,
      user: byId.get(m.userId) ?? null,
    }));
  }
}
