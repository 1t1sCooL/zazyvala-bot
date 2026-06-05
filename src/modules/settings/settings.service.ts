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

  /** Фиксирует время последнего зова и инкрементит счётчик (статистика). */
  async touchLastSummon(chatId: bigint): Promise<void> {
    await this.prisma.chatSettings.update({
      where: { chatId },
      data: { lastSummonAt: new Date(), summonsTotal: { increment: 1 } },
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

  /** Текст-приветствие перед зовом (null — очистить). */
  async setHeader(chatId: bigint, header: string | null): Promise<void> {
    await this.prisma.chatSettings.upsert({
      where: { chatId },
      update: { header },
      create: { chatId, header },
    });
    this.logger.debug(`Set header for chat ${chatId}`);
  }

  /** Кулдаун между зовами (сек). Возвращает false при некорректном значении. */
  async setCooldown(chatId: bigint, sec: number): Promise<boolean> {
    if (!Number.isInteger(sec) || sec < 0 || sec > 86400) return false;
    await this.prisma.chatSettings.upsert({
      where: { chatId },
      update: { cooldownSec: sec },
      create: { chatId, cooldownSec: sec },
    });
    this.logger.debug(`Set cooldownSec=${sec} for chat ${chatId}`);
    return true;
  }

  /** Размер пачки упоминаний (1..10). Возвращает false при некорректном значении. */
  async setMentionsPerBatch(chatId: bigint, n: number): Promise<boolean> {
    if (!Number.isInteger(n) || n < 1 || n > 10) return false;
    await this.prisma.chatSettings.upsert({
      where: { chatId },
      update: { mentionsPerBatch: n },
      create: { chatId, mentionsPerBatch: n },
    });
    this.logger.debug(`Set mentionsPerBatch=${n} for chat ${chatId}`);
    return true;
  }

  /** Язык чата (ru | en). */
  async setLanguage(chatId: bigint, language: string): Promise<void> {
    await this.prisma.chatSettings.upsert({
      where: { chatId },
      update: { language },
      create: { chatId, language },
    });
    this.logger.debug(`Set language=${language} for chat ${chatId}`);
  }
}
