import { Logger } from '@nestjs/common';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { SummonService } from '../summon';
import { Context } from './context.interface';

/**
 * Тонкий хендлер команды зова. Логика — в SummonService.
 */
@Update()
export class SummonUpdate {
  private readonly logger = new Logger(SummonUpdate.name);

  constructor(private readonly summon: SummonService) {}

  @Command('call')
  async onCall(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    if (!chat) return;
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      await ctx.reply('Команда /call работает только в групповом чате.');
      return;
    }

    const customText = extractArgs(ctx);
    this.logger.debug(
      `/call in chat ${chat.id} (text len ${customText.length})`,
    );

    const result = await this.summon.callAll(
      BigInt(chat.id),
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
}

/** Возвращает текст после команды /call (без самой команды и @botname). */
function extractArgs(ctx: Context): string {
  const message = ctx.message as { text?: string } | undefined;
  const text = message?.text ?? '';
  return text.replace(/^\/call(@\w+)?\s*/i, '').trim();
}
