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
}
