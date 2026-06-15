import { Injectable, Logger } from '@nestjs/common';
import { Chat } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface EnsureChatInput {
  id: bigint;
  title?: string | null;
  type?: string | null;
}

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Гарантирует наличие записи чата и его настроек по умолчанию.
   * Идемпотентно: безопасно вызывать на каждом групповом апдейте.
   */
  async ensureChat(input: EnsureChatInput): Promise<Chat> {
    const chat = await this.prisma.chat.upsert({
      where: { id: input.id },
      update: {
        title: input.title ?? undefined,
        type: input.type ?? undefined,
      },
      create: {
        id: input.id,
        title: input.title ?? undefined,
        type: input.type ?? undefined,
      },
    });

    await this.prisma.chatSettings.upsert({
      where: { chatId: input.id },
      update: {},
      create: { chatId: input.id },
    });

    this.logger.debug(`Ensured chat ${input.id}`);
    return chat;
  }

  /** Telegram id чатов без сохранённого названия — вход для бэкфилла title. */
  async listIdsWithoutTitle(): Promise<bigint[]> {
    const rows = await this.prisma.chat.findMany({
      where: { OR: [{ title: null }, { title: '' }] },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /** Проставляет название существующему чату (бэкфилл из getChat). */
  async setTitle(id: bigint, title: string): Promise<void> {
    await this.prisma.chat.updateMany({ where: { id }, data: { title } });
    this.logger.debug(`Set title for chat ${id}: ${title}`);
  }

  /**
   * Переносит чат на новый Telegram id при миграции group → supergroup.
   * FK-связи (members, settings, assistants, tag groups) следуют за чатом
   * каскадом (onUpdate: Cascade — дефолт Prisma). Идемпотентно: если старого
   * чата нет, ничего не делает.
   */
  async migrateChat(oldId: bigint, newId: bigint): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const oldChat = await tx.chat.findUnique({ where: { id: oldId } });
      if (!oldChat) {
        this.logger.warn(
          `[FIX] migrateChat: chat ${oldId} not found, nothing to migrate to ${newId}`,
        );
        return;
      }

      // Activity-middleware мог успеть создать «пустышку» под новым id
      // (первое сообщение в супергруппе приходит раньше сервисного о миграции).
      const stub = await tx.chat.findUnique({ where: { id: newId } });
      if (stub) {
        await tx.chat.delete({ where: { id: newId } });
        this.logger.warn(
          `[FIX] migrateChat: removed auto-created stub chat ${newId}`,
        );
      }

      await tx.chat.update({
        where: { id: oldId },
        data: { id: newId, type: 'supergroup' },
      });
    });
    this.logger.log(
      `[FIX] migrateChat: chat ${oldId} migrated to ${newId}, member registry preserved`,
    );
  }
}
