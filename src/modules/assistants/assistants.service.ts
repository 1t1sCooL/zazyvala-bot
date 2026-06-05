import { Injectable, Logger } from '@nestjs/common';
import { Assistant, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Лимит помощников на чат (free-тариф, как в референсе). */
export const MAX_ASSISTANTS_PER_CHAT = 2;

export type AddResult =
  | { status: 'ok' }
  | { status: 'exists' }
  | { status: 'limit'; max: number };

export type RemoveResult = { status: 'ok' } | { status: 'not_found' };

export interface AssistantWithUser {
  userId: bigint;
  user: User | null;
}

@Injectable()
export class AssistantsService {
  private readonly logger = new Logger(AssistantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async isAssistant(chatId: bigint, userId: bigint): Promise<boolean> {
    const found = await this.prisma.assistant.count({
      where: { chatId, userId },
    });
    return found > 0;
  }

  async count(chatId: bigint): Promise<number> {
    return this.prisma.assistant.count({ where: { chatId } });
  }

  async add(
    chatId: bigint,
    userId: bigint,
    addedBy?: bigint,
  ): Promise<AddResult> {
    if (await this.isAssistant(chatId, userId)) {
      return { status: 'exists' };
    }
    if ((await this.count(chatId)) >= MAX_ASSISTANTS_PER_CHAT) {
      return { status: 'limit', max: MAX_ASSISTANTS_PER_CHAT };
    }

    await this.prisma.assistant.create({
      data: { chatId, userId, addedBy: addedBy ?? null },
    });
    this.logger.debug(`Added assistant ${userId} to chat ${chatId}`);
    return { status: 'ok' };
  }

  async remove(chatId: bigint, userId: bigint): Promise<RemoveResult> {
    const { count } = await this.prisma.assistant.deleteMany({
      where: { chatId, userId },
    });
    this.logger.debug(
      `Removed assistant ${userId} from chat ${chatId} (count ${count})`,
    );
    return count > 0 ? { status: 'ok' } : { status: 'not_found' };
  }

  async list(chatId: bigint): Promise<Assistant[]> {
    return this.prisma.assistant.findMany({ where: { chatId } });
  }

  /** Список помощников с подтянутыми записями пользователей (для отображения имён). */
  async listWithUsers(chatId: bigint): Promise<AssistantWithUser[]> {
    const assistants = await this.list(chatId);
    if (assistants.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: assistants.map((a) => a.userId) } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return assistants.map((a) => ({
      userId: a.userId,
      user: byId.get(a.userId) ?? null,
    }));
  }
}
