import { Logger } from '@nestjs/common';
import { Ctx, Help, Start, Update } from 'nestjs-telegraf';
import { asLang, t } from '../i18n';
import { SettingsService } from '../settings';
import { Context } from './context.interface';

/**
 * Тонкий Telegram-хендлер: только разбирает апдейт и отвечает.
 * Бизнес-логика появится в доменных сервисах (summon, members, ...).
 */
@Update()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(private readonly settings: SettingsService) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    this.logger.debug(`/start from chat ${ctx.chat?.id}`);
    await ctx.reply(t(await this.lang(ctx), 'welcome'));
  }

  @Help()
  async onHelp(@Ctx() ctx: Context): Promise<void> {
    this.logger.debug(`/help from chat ${ctx.chat?.id}`);
    await ctx.reply(t(await this.lang(ctx), 'help'));
  }

  /** Язык чата: для групп — из настроек, для лички — ru по умолчанию. */
  private async lang(ctx: Context): Promise<string> {
    const chat = ctx.chat;
    if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
      const s = await this.settings.getForChat(BigInt(chat.id));
      return asLang(s.language);
    }
    return 'ru';
  }
}
