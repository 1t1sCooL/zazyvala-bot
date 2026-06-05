import { Injectable, Logger } from '@nestjs/common';
import type { Telegram } from 'telegraf';
import { MembersService } from '../members';
import { SettingsService } from '../settings';
import { sendWithRetry, sleep } from '../../shared/utils/telegram-retry';
import { buildMentionMessage, chunk, MentionTarget } from './mention-builder';

const INTER_BATCH_DELAY_MS = 1200;

export type SummonResult =
  | { status: 'ok'; notified: number; batches: number }
  | { status: 'cooldown'; retryAfterSec: number }
  | { status: 'empty' };

@Injectable()
export class SummonService {
  private readonly logger = new Logger(SummonService.name);

  constructor(
    private readonly members: MembersService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Зовёт всех активных подписанных участников чата пачками упоминаний.
   * Возвращает результат: ok / cooldown / empty.
   */
  async callAll(
    chatId: bigint,
    telegram: Telegram,
    customText?: string,
  ): Promise<SummonResult> {
    const settings = await this.settings.getForChat(chatId);

    const cooldown = this.checkCooldown(
      settings.lastSummonAt,
      settings.cooldownSec,
    );
    if (cooldown !== null) {
      this.logger.warn(`Summon on cooldown in chat ${chatId}`);
      return { status: 'cooldown', retryAfterSec: cooldown };
    }

    const members = await this.members.listActiveSubscribed(chatId);
    if (members.length === 0) {
      this.logger.warn(`Nobody to summon in chat ${chatId}`);
      return { status: 'empty' };
    }

    const targets: MentionTarget[] = members.map((m) => ({
      userId: m.user.id,
      name: m.user.firstName ?? m.user.username ?? 'участник',
    }));

    const header = customText?.trim() || settings.header || undefined;
    const batches = chunk(targets, settings.mentionsPerBatch);

    this.logger.debug(
      `Summoning ${targets.length} members in chat ${chatId} (${batches.length} batches)`,
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
        // Частичный успех: один сбойный батч не отменяет весь зов.
        this.logger.error(
          `Failed to send summon batch ${i} in chat ${chatId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      if (i < batches.length - 1) await sleep(INTER_BATCH_DELAY_MS);
    }

    await this.settings.touchLastSummon(chatId);
    return { status: 'ok', notified, batches: batches.length };
  }

  /** Возвращает оставшиеся секунды кулдауна или null, если зов разрешён. */
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
