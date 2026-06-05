import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Context } from './context.interface';

// Меню команд, которое Telegram показывает при вводе "/".
const COMMANDS = [
  { command: 'start', description: 'Приветствие' },
  { command: 'help', description: 'Список команд' },
  {
    command: 'call',
    description: 'Позвать всех (или группу): /call [группа] [текст]',
  },
  { command: 'join', description: 'Подписаться на зов' },
  { command: 'leave', description: 'Отписаться от зова' },
  { command: 'helpers', description: 'Список помощников' },
  { command: 'addhelper', description: 'Назначить помощника (ответом, админ)' },
  { command: 'delhelper', description: 'Снять помощника (ответом, админ)' },
  { command: 'callpolicy', description: 'Кто может звать (админ)' },
  { command: 'groups', description: 'Группы тегов' },
  { command: 'newgroup', description: 'Создать группу тегов (админ)' },
  { command: 'delgroup', description: 'Удалить группу тегов (админ)' },
  { command: 'joingroup', description: 'Войти в группу тегов' },
  { command: 'leavegroup', description: 'Выйти из группы тегов' },
  { command: 'settings', description: 'Настройки чата' },
  { command: 'setheader', description: 'Текст зова (админ)' },
  { command: 'setcooldown', description: 'Кулдаун между зовами (админ)' },
  { command: 'setbatch', description: 'Размер пачки упоминаний (админ)' },
  { command: 'setlang', description: 'Язык чата ru/en (админ)' },
  { command: 'ignore', description: 'Исключить из зова (ответом, админ)' },
  { command: 'unignore', description: 'Вернуть в зов (ответом, админ)' },
];

/**
 * Регистрирует меню команд бота (setMyCommands), чтобы при вводе "/"
 * Telegram показывал список доступных команд.
 */
@Injectable()
export class BotCommandsService implements OnModuleInit {
  private readonly logger = new Logger(BotCommandsService.name);

  constructor(@InjectBot() private readonly bot: Telegraf<Context>) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.bot.telegram.setMyCommands(COMMANDS);
      this.logger.debug(`[FIX] Registered ${COMMANDS.length} bot commands`);
    } catch (err) {
      // Сетевой сбой не должен ронять старт приложения.
      this.logger.error(
        `[FIX] Failed to set bot commands: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
