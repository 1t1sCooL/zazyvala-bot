import { Logger } from '@nestjs/common';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { AssistantsService } from '../assistants';
import { SettingsService } from '../settings';
import {
  CALL_POLICIES,
  canSummon,
  describePolicy,
  isCallPolicy,
  SummonService,
} from '../summon';
import { Context } from './context.interface';
import { isChatAdmin } from './is-chat-admin';

/**
 * Тонкий хендлер команды зова + управление политикой прав. Логика — в сервисах.
 */
@Update()
export class SummonUpdate {
  private readonly logger = new Logger(SummonUpdate.name);

  constructor(
    private readonly summon: SummonService,
    private readonly settings: SettingsService,
    private readonly assistants: AssistantsService,
  ) {}

  @Command('call')
  async onCall(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    const from = ctx.from;
    if (!chat || !from) return;
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      await ctx.reply('Команда /call работает только в групповом чате.');
      return;
    }

    const chatId = BigInt(chat.id);
    const settings = await this.settings.getForChat(chatId);

    // Проверка прав на зов согласно политике чата.
    const [isAdmin, isAssistant] = await Promise.all([
      isChatAdmin(ctx.telegram, chat.id, from.id),
      this.assistants.isAssistant(chatId, BigInt(from.id)),
    ]);
    if (!canSummon(settings.callPolicy, { isAdmin, isAssistant })) {
      this.logger.debug(`/call denied for ${from.id} in chat ${chatId}`);
      await ctx.reply(
        `Звать может: ${describePolicy(settings.callPolicy)}. ` +
          `Политику меняет админ: /callpolicy`,
      );
      return;
    }

    const customText = extractArgs(ctx, 'call');
    this.logger.debug(
      `/call in chat ${chatId} (text len ${customText.length})`,
    );

    const result = await this.summon.callAll(
      chatId,
      ctx.telegram,
      customText || undefined,
    );

    switch (result.status) {
      case 'cooldown':
        await ctx.reply(
          `Слишком часто. Попробуйте через ${result.retryAfterSec} сек.`,
        );
        break;
      case 'empty':
        await ctx.reply(
          'Некого звать — пусть участники напишут /join или просто что-нибудь в чат.',
        );
        break;
      case 'ok':
        // Зов уже отправлен пачками — лишнего сообщения не добавляем.
        break;
    }
  }

  @Command('callpolicy')
  async onCallPolicy(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    const from = ctx.from;
    if (!chat || !from) return;
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      await ctx.reply('Команда работает только в групповом чате.');
      return;
    }

    const chatId = BigInt(chat.id);
    const arg = extractArgs(ctx, 'callpolicy').toLowerCase();

    if (!arg) {
      const settings = await this.settings.getForChat(chatId);
      await ctx.reply(
        `Сейчас звать может: ${describePolicy(settings.callPolicy)}.\n` +
          `Сменить: /callpolicy <${CALL_POLICIES.join(' | ')}>`,
      );
      return;
    }

    if (!(await isChatAdmin(ctx.telegram, chat.id, from.id))) {
      await ctx.reply('Менять политику может только администратор чата.');
      return;
    }

    if (!isCallPolicy(arg)) {
      await ctx.reply(
        `Неизвестная политика. Варианты: ${CALL_POLICIES.join(', ')}`,
      );
      return;
    }

    await this.settings.setCallPolicy(chatId, arg);
    this.logger.debug(`callPolicy=${arg} set in chat ${chatId}`);
    await ctx.reply(`Готово. Теперь звать может: ${describePolicy(arg)}.`);
  }
}

/** Возвращает текст после команды (без самой команды и @botname). */
function extractArgs(ctx: Context, command: string): string {
  const message = ctx.message as { text?: string } | undefined;
  const text = message?.text ?? '';
  return text.replace(new RegExp(`^/${command}(@\\w+)?\\s*`, 'i'), '').trim();
}
