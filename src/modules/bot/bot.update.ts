import { Logger } from '@nestjs/common';
import { Ctx, Help, Start, Update } from 'nestjs-telegraf';
import { Context } from './context.interface';

const WELCOME =
  'Привет! Я «Зазывала» — зову всех участников группы одним сообщением.\n\n' +
  'Добавь меня в групповой чат и используй /help, чтобы увидеть команды.';

const HELP =
  'Команды:\n' +
  '/call <текст> — позвать всех подписанных участников (текст необязателен)\n' +
  '/join — подписаться на зов\n' +
  '/leave — отписаться от зова\n' +
  '/helpers — список помощников\n' +
  '/addhelper, /delhelper — управление помощниками (ответом на сообщение; только админ)\n' +
  '/callpolicy — кто может звать: all | assistants | admins (меняет админ)\n' +
  '/groups — группы тегов; /newgroup, /delgroup (админ); /joingroup, /leavegroup\n' +
  '/call <группа> — позвать только участников группы\n\n' +
  'Добавьте меня в группу: я регистрирую участников автоматически, а /call созывает их пачками.';

/**
 * Тонкий Telegram-хендлер: только разбирает апдейт и отвечает.
 * Бизнес-логика появится в доменных сервисах (summon, members, ...).
 */
@Update()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    this.logger.debug(`/start from chat ${ctx.chat?.id}`);
    await ctx.reply(WELCOME);
  }

  @Help()
  async onHelp(@Ctx() ctx: Context): Promise<void> {
    this.logger.debug(`/help from chat ${ctx.chat?.id}`);
    await ctx.reply(HELP);
  }
}
