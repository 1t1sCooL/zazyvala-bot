import { Injectable, Logger } from '@nestjs/common';
import type { Telegram } from 'telegraf';
import { User } from '@prisma/client';
import { MembersService } from '../members';
import { MetricsService } from '../metrics';
import { SettingsService } from '../settings';
import { TagGroupsService } from '../tag-groups';
import { displayName } from '../../shared/utils/display-name';
import { sendWithRetry, sleep } from '../../shared/utils/telegram-retry';
import { buildMentionMessage, chunk, MentionTarget } from './mention-builder';

const INTER_BATCH_DELAY_MS = 1200;
// Подсказка о неполном реестре показывается, когда позвали меньше этой доли
// людей в чате (без учёта самого бота).
const COVERAGE_HINT_RATIO = 0.9;

export type SummonResult =
  | { status: 'ok'; notified: number; batches: number; missing?: number }
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
    threadId?: number,
  ): Promise<SummonResult> {
    const settings = await this.settings.getForChat(chatId);
    // Bot API не отдаёт список участников чата — реестр пополняется только по
    // активности/событиям. Админов можно получить явно: подкачиваем их перед
    // зовом, чтобы в свежедобавленном чате звать не одного инициатора.
    await this.syncChatAdmins(chatId, telegram);
    const members = await this.members.listActiveSubscribed(chatId);
    const targets = members.map((m) => toTarget(m.user));
    const result = await this.dispatch(
      chatId,
      telegram,
      targets,
      settings,
      customText,
      threadId,
    );
    if (result.status === 'ok') {
      const missing = await this.coverageGap(chatId, telegram, result.notified);
      if (missing > 0) return { ...result, missing };
    }
    return result;
  }

  /** Регистрирует администраторов чата в реестре (не трогая их подписку). */
  private async syncChatAdmins(
    chatId: bigint,
    telegram: Telegram,
  ): Promise<void> {
    try {
      const admins = await telegram.getChatAdministrators(Number(chatId));
      for (const admin of admins) {
        if (admin.user.is_bot) continue;
        await this.members.registerMember(chatId, {
          id: BigInt(admin.user.id),
          username: admin.user.username,
          firstName: admin.user.first_name,
          lastName: admin.user.last_name,
          isBot: admin.user.is_bot,
        });
      }
      this.logger.debug(
        `[FIX] Synced ${admins.length} chat admins into registry for chat ${chatId}`,
      );
    } catch (err) {
      // Сбой подкачки не должен ломать зов — зовём тех, кто уже в реестре.
      this.logger.warn(
        `[FIX] Failed to sync chat admins for chat ${chatId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Сколько людей в чате не попало в зов (реестр неполный). 0 — если покрытие
   * достаточное или счётчик участников недоступен.
   */
  private async coverageGap(
    chatId: bigint,
    telegram: Telegram,
    notified: number,
  ): Promise<number> {
    try {
      const total = await telegram.getChatMembersCount(Number(chatId));
      const humans = total - 1; // не считаем самого бота
      this.logger.log(
        `[FIX] Summon coverage in chat ${chatId}: notified ${notified} of ~${humans}`,
      );
      if (humans <= 0 || notified >= humans * COVERAGE_HINT_RATIO) return 0;
      return humans - notified;
    } catch (err) {
      this.logger.warn(
        `[FIX] Failed to get member count for chat ${chatId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return 0;
    }
  }

  /** Зовёт участников именованной группы тегов. */
  async callGroup(
    chatId: bigint,
    telegram: Telegram,
    groupName: string,
    customText?: string,
    threadId?: number,
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
    return this.dispatch(
      chatId,
      telegram,
      targets,
      settings,
      customText,
      threadId,
    );
  }

  /** Общее ядро: кулдаун → батчи → фиксация времени. */
  private async dispatch(
    chatId: bigint,
    telegram: Telegram,
    targets: MentionTarget[],
    settings: ChatSummonSettings,
    customText?: string,
    threadId?: number,
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
      `[FIX] Summoning ${targets.length} in chat ${chatId} ` +
        `(${batches.length} batches, topic=${threadId ?? '-'})`,
    );

    let notified = 0;
    for (let i = 0; i < batches.length; i++) {
      const { text, entities } = buildMentionMessage(
        batches[i],
        i === 0 ? header : undefined,
      );
      try {
        await sendWithRetry(() =>
          // В форум-чате (топики) без message_thread_id сообщение уходит в
          // General — в корпоративных чатах он часто скрыт или закрыт,
          // и зов «исчезает». Шлём в топик, где вызвали команду.
          telegram.sendMessage(Number(chatId), text, {
            entities,
            message_thread_id: threadId,
          }),
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
    name: displayName(user),
  };
}
