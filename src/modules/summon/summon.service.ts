import { Injectable, Logger } from '@nestjs/common';
import type { Telegram } from 'telegraf';
import { User } from '@prisma/client';
import { MembersService } from '../members';
import { MetricsService } from '../metrics';
import { SettingsService } from '../settings';
import { TagGroupsService } from '../tag-groups';
import { sendWithRetry, sleep } from '../../shared/utils/telegram-retry';
import { buildMentionMessage, chunk, MentionTarget } from './mention-builder';

const INTER_BATCH_DELAY_MS = 1200;

export type SummonResult =
  | { status: 'ok'; notified: number; batches: number }
  | { status: 'cooldown'; retryAfterSec: number }
  | { status: 'empty' }
  | { status: 'no_group' };

interface ChatSummonSettings {
  header: string | null;
  mentionsPerBatch: number;
  cooldownSec: number;
  lastSummonAt: Date | null;
}

@Injectable()
export class SummonService {
  private readonly logger = new Logger(SummonService.name);

  constructor(
    private readonly members: MembersService,
    private readonly settings: SettingsService,
    private readonly tagGroups: TagGroupsService,
    private readonly metrics: MetricsService,
  ) {}

  /** Зовёт всех активных подписанных участников чата. */
  async callAll(
    chatId: bigint,
    telegram: Telegram,
    customText?: string,
  ): Promise<SummonResult> {
    const settings = await this.settings.getForChat(chatId);
    const members = await this.members.listActiveSubscribed(chatId);
    const targets = members.map((m) => toTarget(m.user));
    return this.dispatch(chatId, telegram, targets, settings, customText);
  }

  /** Зовёт участников именованной группы тегов. */
  async callGroup(
    chatId: bigint,
    telegram: Telegram,
    groupName: string,
    customText?: string,
  ): Promise<SummonResult> {
    const members = await this.tagGroups.listMembersWithUsers(
      chatId,
      groupName,
    );
    if (members === null) return { status: 'no_group' };

    const settings = await this.settings.getForChat(chatId);
    const targets = members.map((m) =>
      m.user ? toTarget(m.user) : { userId: m.userId, name: `id ${m.userId}` },
    );
    this.logger.debug(`Summoning group "${groupName}" in chat ${chatId}`);
    return this.dispatch(chatId, telegram, targets, settings, customText);
  }

  /** Общее ядро: кулдаун → батчи → фиксация времени. */
  private async dispatch(
    chatId: bigint,
    telegram: Telegram,
    targets: MentionTarget[],
    settings: ChatSummonSettings,
    customText?: string,
  ): Promise<SummonResult> {
    const cooldown = this.checkCooldown(
      settings.lastSummonAt,
      settings.cooldownSec,
    );
    if (cooldown !== null) {
      this.logger.warn(`Summon on cooldown in chat ${chatId}`);
      return { status: 'cooldown', retryAfterSec: cooldown };
    }

    if (targets.length === 0) {
      this.logger.warn(`Nobody to summon in chat ${chatId}`);
      return { status: 'empty' };
    }

    const header = customText?.trim() || settings.header || undefined;
    const batches = chunk(targets, settings.mentionsPerBatch);
    this.logger.debug(
      `Summoning ${targets.length} in chat ${chatId} (${batches.length} batches)`,
    );

    let notified = 0;
    for (let i = 0; i < batches.length; i++) {
      const { text, entities } = buildMentionMessage(
        batches[i],
        i === 0 ? header : undefined,
      );
      try {
        await sendWithRetry(() =>
          telegram.sendMessage(Number(chatId), text, { entities }),
        );
        notified += batches[i].length;
      } catch (err) {
        this.logger.error(
          `Failed to send summon batch ${i} in chat ${chatId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      if (i < batches.length - 1) await sleep(INTER_BATCH_DELAY_MS);
    }

    await this.settings.touchLastSummon(chatId);
    this.metrics.incSummons();
    return { status: 'ok', notified, batches: batches.length };
  }

  private checkCooldown(
    lastSummonAt: Date | null,
    cooldownSec: number,
  ): number | null {
    if (!lastSummonAt || cooldownSec <= 0) return null;
    const elapsedSec = (Date.now() - lastSummonAt.getTime()) / 1000;
    if (elapsedSec >= cooldownSec) return null;
    return Math.ceil(cooldownSec - elapsedSec);
  }
}

function toTarget(user: User): MentionTarget {
  return {
    userId: user.id,
    name: user.firstName ?? user.username ?? 'участник',
  };
}
