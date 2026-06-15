import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { displayName } from '../../shared/utils/display-name';
import { AssistantsService } from '../assistants';
import { MembersService } from '../members';
import { SettingsService } from '../settings';
import { UpdateMemberDto, UpdateSettingsDto } from './dto';

export interface AdminStats {
  chats: number;
  users: number;
  activeMembers: number;
  summonsTotal: number;
}

export interface AdminChatSummary {
  id: bigint;
  title: string | null;
  type: string | null;
  members: number;
  assistants: number;
  summonsTotal: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly assistants: AssistantsService,
    private readonly members: MembersService,
  ) {}

  async getStats(): Promise<AdminStats> {
    const [chats, users, activeMembers, sum] = await Promise.all([
      this.prisma.chat.count(),
      this.prisma.user.count(),
      this.prisma.chatMember.count({ where: { status: 'active' } }),
      this.prisma.chatSettings.aggregate({ _sum: { summonsTotal: true } }),
    ]);
    this.logger.debug('Admin stats requested');
    return {
      chats,
      users,
      activeMembers,
      summonsTotal: sum._sum.summonsTotal ?? 0,
    };
  }

  async listChats(): Promise<AdminChatSummary[]> {
    const chats = await this.prisma.chat.findMany({
      include: {
        settings: true,
        _count: { select: { members: true, assistants: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return chats.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      members: c._count.members,
      assistants: c._count.assistants,
      summonsTotal: c.settings?.summonsTotal ?? 0,
    }));
  }

  async getChatDetail(chatId: bigint) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        settings: true,
        _count: { select: { members: true, assistants: true } },
      },
    });
    if (!chat) throw new NotFoundException('Chat not found');

    const assistants = await this.assistants.listWithUsers(chatId);
    return {
      id: chat.id,
      title: chat.title,
      type: chat.type,
      members: chat._count.members,
      settings: chat.settings,
      assistants: assistants.map((a) => ({
        userId: a.userId,
        name: a.user ? displayName(a.user, `id ${a.userId}`) : null,
      })),
    };
  }

  async listMembers(chatId: bigint, limit = 50, offset = 0) {
    const members = await this.prisma.chatMember.findMany({
      where: { chatId },
      include: { user: true },
      orderBy: { joinedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      skip: Math.max(offset, 0),
    });
    const pending = await this.members.listPendingUsernames(chatId);
    return [
      ...members.map((m) => ({
        userId: m.userId,
        name: m.user ? displayName(m.user, `id ${m.userId}`) : null,
        username: m.user?.username ?? null,
        status: m.status,
        subscribed: m.subscribed,
        blacklisted: m.blacklisted,
      })),
      // @username-участники, ещё не сопоставленные с Telegram id
      ...pending.map((username) => ({
        userId: null,
        name: `@${username}`,
        username,
        status: 'pending',
        subscribed: true,
        blacklisted: false,
      })),
    ];
  }

  /** Добавляет участника по @username; member — если id уже известен боту. */
  async addMemberByUsername(chatId: bigint, username: string) {
    const result = await this.members.addByUsername(chatId, username);
    this.logger.log(
      `Admin added member @${username} to chat ${chatId} ` +
        `(resolved=${result.resolved})`,
    );
    return result.resolved
      ? { status: 'member', userId: result.member.userId }
      : { status: 'pending', username: result.username };
  }

  /** Правит флаги участника (подписка/blacklist) по userId. */
  async updateMember(chatId: bigint, userId: bigint, dto: UpdateMemberDto) {
    const res = await this.members.updateMemberFlags(chatId, userId, {
      subscribed: dto.subscribed,
      blacklisted: dto.blacklisted,
    });
    if (res.status === 'not_found') {
      throw new NotFoundException('Member not found');
    }
    this.logger.log(`Admin updated member ${userId} in chat ${chatId}`);
    // userId — BigInt, не сериализуется в JSON напрямую → строкой.
    return { status: 'updated', userId: userId.toString() };
  }

  /** Жёстко удаляет участника из реестра чата по userId. */
  async removeMember(chatId: bigint, userId: bigint) {
    const res = await this.members.removeMember(chatId, userId);
    if (res.status === 'not_found') {
      throw new NotFoundException('Member not found');
    }
    this.logger.log(`Admin removed member ${userId} from chat ${chatId}`);
    return { status: 'removed', userId: userId.toString() };
  }

  /** Удаляет ещё не сопоставленную @username-запись. */
  async removePendingMember(chatId: bigint, username: string) {
    const removed = await this.members.removePendingByUsername(
      chatId,
      username,
    );
    if (!removed) throw new NotFoundException('Pending member not found');
    return { status: 'removed', username };
  }

  /** Применяет частичное обновление настроек чата через доменные сеттеры. */
  async updateSettings(chatId: bigint, dto: UpdateSettingsDto) {
    if (dto.header !== undefined) {
      await this.settings.setHeader(chatId, dto.header || null);
    }
    if (dto.cooldownSec !== undefined) {
      await this.settings.setCooldown(chatId, dto.cooldownSec);
    }
    if (dto.mentionsPerBatch !== undefined) {
      await this.settings.setMentionsPerBatch(chatId, dto.mentionsPerBatch);
    }
    if (dto.callPolicy !== undefined) {
      await this.settings.setCallPolicy(chatId, dto.callPolicy);
    }
    if (dto.language !== undefined) {
      await this.settings.setLanguage(chatId, dto.language);
    }
    this.logger.debug(`Admin updated settings for chat ${chatId}`);
    return this.settings.getForChat(chatId);
  }

  listAssistants(chatId: bigint) {
    return this.assistants.listWithUsers(chatId);
  }

  addAssistant(chatId: bigint, userId: bigint) {
    return this.assistants.add(chatId, userId);
  }

  removeAssistant(chatId: bigint, userId: bigint) {
    return this.assistants.remove(chatId, userId);
  }
}
