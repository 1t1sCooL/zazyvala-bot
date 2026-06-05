import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Context } from './context.interface';

export interface BotCommand {
  command: string;
  description: string;
}

// Меню по умолчанию, если BOT_COMMANDS не задано в окружении.
export const DEFAULT_COMMANDS: BotCommand[] = [
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

const COMMAND_RE = /^[a-z0-9_]{1,32}$/;

/**
 * Разбирает строку меню команд из env.
 * Формат: пары "command:описание", разделённые ";" или переводом строки.
 * Невалидные команды (по правилам Telegram) пропускаются.
 */
export function parseBotCommands(raw: string): BotCommand[] {
  const result: BotCommand[] = [];
  for (const part of raw.split(/[;\n]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(':');
    if (sep === -1) continue;
    const command = trimmed.slice(0, sep).trim().toLowerCase();
    const description = trimmed
      .slice(sep + 1)
      .trim()
      .slice(0, 256);
    if (!COMMAND_RE.test(command) || !description) continue;
    result.push({ command, description });
  }
  return result;
}

/**
 * Регистрирует меню команд бота (setMyCommands) — чтобы при вводе "/"
 * Telegram показывал список команд. Список берётся из BOT_COMMANDS или дефолта.
 */
@Injectable()
export class BotCommandsService implements OnModuleInit {
  private readonly logger = new Logger(BotCommandsService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const raw = this.config.get<string>('BOT_COMMANDS');
    const parsed = raw ? parseBotCommands(raw) : [];
    const commands = parsed.length > 0 ? parsed : DEFAULT_COMMANDS;
    const source = parsed.length > 0 ? 'env' : 'default';

    try {
      await this.bot.telegram.setMyCommands(commands);
      this.logger.log(
        `Registered ${commands.length} bot commands (source: ${source})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to set bot commands: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
