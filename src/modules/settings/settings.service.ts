import { Injectable, Logger } from '@nestjs/common';
import { ChatSettings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Возвращает настройки чата, создавая запись с дефолтами при отсутствии. */
  async getForChat(chatId: bigint): Promise<ChatSettings> {
    return this.prisma.chatSettings.upsert({
      where: { chatId },
      update: {},
      create: { chatId },
    });
  }

  /** Фиксирует время последнего зова (для кулдауна). */
  async touchLastSummon(chatId: bigint): Promise<void> {
    await this.prisma.chatSettings.update({
      where: { chatId },
      data: { lastSummonAt: new Date() },
    });
    this.logger.debug(`Updated lastSummonAt for chat ${chatId}`);
  }

  /** Устанавливает политику прав на зов (all | assistants | admins). */
  async setCallPolicy(chatId: bigint, policy: string): Promise<void> {
    await this.prisma.chatSettings.upsert({
      where: { chatId },
      update: { callPolicy: policy },
      create: { chatId, callPolicy: policy },
    });
    this.logger.debug(`Set callPolicy=${policy} for chat ${chatId}`);
  }
}
