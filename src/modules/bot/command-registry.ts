import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

// /start и /help всегда доступны, даже если их нет в BOT_COMMANDS,
// иначе бот можно случайно «закрыть» от пользователя.
const ALWAYS_ON = new Set(['start', 'help']);

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
 * Единый источник правды по командам бота.
 * Если BOT_COMMANDS задан — это белый список: только эти команды доступны и
 * показываются в /help и меню "/". Иначе — встроенный полный список.
 */
@Injectable()
export class CommandRegistry {
  private readonly envCommands: BotCommand[];

  constructor(config: ConfigService) {
    const raw = config.get<string>('BOT_COMMANDS');
    this.envCommands = raw ? parseBotCommands(raw) : [];
  }

  /** Задан ли явный белый список через env. */
  get configured(): boolean {
    return this.envCommands.length > 0;
  }

  /** Эффективный список команд (для меню "/" и /help). */
  list(): BotCommand[] {
    return this.configured ? this.envCommands : DEFAULT_COMMANDS;
  }

  /** Доступна ли команда к выполнению. */
  isEnabled(command: string): boolean {
    if (!this.configured) return true;
    if (ALWAYS_ON.has(command)) return true;
    return this.envCommands.some((c) => c.command === command);
  }

  /** Текст для /help, собранный из эффективного списка команд. */
  helpText(): string {
    return this.list()
      .map((c) => `/${c.command} — ${c.description}`)
      .join('\n');
  }
}

@Global()
@Module({
  providers: [CommandRegistry],
  exports: [CommandRegistry],
})
export class CommandRegistryModule {}
