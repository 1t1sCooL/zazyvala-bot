import { Injectable, Logger } from '@nestjs/common';
import { ChatMember, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface EnsureUserInput {
  id: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isBot?: boolean;
}

export type ChatMemberWithUser = ChatMember & { user: User };

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Создаёт/обновляет глобальную запись пользователя Telegram. */
  async ensureUser(input: EnsureUserInput): Promise<User> {
    return this.prisma.user.upsert({
      where: { id: input.id },
      update: {
        username: input.username ?? undefined,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        isBot: input.isBot ?? undefined,
      },
      create: {
        id: input.id,
        username: input.username ?? undefined,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        isBot: input.isBot ?? false,
      },
    });
  }

  /** Регистрирует участника чата как активного (создаёт user при необходимости). */
  async registerMember(
    chatId: bigint,
    user: EnsureUserInput,
  ): Promise<ChatMember> {
    await this.ensureUser(user);

    const member = await this.prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      update: { status: 'active', leftAt: null },
      create: {
        chatId,
        userId: user.id,
        status: 'active',
        subscribed: true,
      },
    });

    this.logger.debug(`Registered member ${user.id} in chat ${chatId}`);
    return member;
  }

  /** Помечает участника ушедшим (idempotent — не падает, если записи нет). */
  async markLeft(chatId: bigint, userId: bigint): Promise<void> {
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId },
      data: { status: 'left', leftAt: new Date() },
    });
    this.logger.debug(`Marked member ${userId} left in chat ${chatId}`);
  }

  /** Переключает подписку участника на зов (opt-in/opt-out). */
  async setSubscribed(
    chatId: bigint,
    user: EnsureUserInput,
    subscribed: boolean,
  ): Promise<ChatMember> {
    await this.ensureUser(user);

    const member = await this.prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      update: { subscribed, status: 'active', leftAt: null },
      create: {
        chatId,
        userId: user.id,
        status: 'active',
        subscribed,
      },
    });

    this.logger.debug(
      `Set subscribed=${subscribed} for member ${user.id} in chat ${chatId}`,
    );
    return member;
  }

  /** Активные подписанные участники чата (кроме blacklist) — кандидаты для зова. */
  async listActiveSubscribed(chatId: bigint): Promise<ChatMemberWithUser[]> {
    return this.prisma.chatMember.findMany({
      where: {
        chatId,
        status: 'active',
        subscribed: true,
        blacklisted: false,
      },
      include: { user: true },
    });
  }

  /** Включает/выключает исключение участника из зова (blacklist). */
  async setBlacklisted(
    chatId: bigint,
    user: EnsureUserInput,
    value: boolean,
  ): Promise<void> {
    await this.ensureUser(user);
    await this.prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      update: { blacklisted: value },
      create: {
        chatId,
        userId: user.id,
        status: 'active',
        blacklisted: value,
      },
    });
    this.logger.debug(
      `Set blacklisted=${value} for member ${user.id} in chat ${chatId}`,
    );
  }
}
