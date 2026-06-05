import { Logger } from '@nestjs/common';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { MembersService } from '../members';
import { SettingsService } from '../settings';
import { describePolicy } from '../summon';
import { commandArg, fromUserInput, replyTarget } from './command-args';
import { Context } from './context.interface';
import { isChatAdmin } from './is-chat-admin';

/**
 * Просмотр и изменение настроек чата + blacklist (исключение из зова).
 * Изменения — только администратор чата.
 */
@Update()
export class SettingsUpdate {
  private readonly logger = new Logger(SettingsUpdate.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly members: MembersService,
  ) {}

  @Command('settings')
  async onView(@Ctx() ctx: Context): Promise<void> {
    if (!isGroupChat(ctx)) return;
    const s = await this.settings.getForChat(BigInt(ctx.chat!.id));
    await ctx.reply(
      [
        'Настройки чата:',
        `• Текст зова: ${s.header ?? '— (по умолчанию)'}`,
        `• Кулдаун: ${s.cooldownSec} сек`,
        `• Упоминаний в пачке: ${s.mentionsPerBatch}`,
        `• Язык: ${s.language}`,
        `• Звать может: ${describePolicy(s.callPolicy)}`,
        '',
        'Изменить (админ): /setheader, /setcooldown, /setbatch, /setlang, /callpolicy',
        'Исключить из зова: ответьте /ignore (вернуть — /unignore)',
      ].join('\n'),
    );
  }

  @Command('setheader')
  async onSetHeader(@Ctx() ctx: Context): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    const value = commandArg(ctx, 'setheader');
    await this.settings.setHeader(BigInt(ctx.chat!.id), value || null);
    await ctx.reply(
      value ? `Текст зова обновлён.` : 'Текст зова сброшен на стандартный.',
    );
  }

  @Command('setcooldown')
  async onSetCooldown(@Ctx() ctx: Context): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    const arg = commandArg(ctx, 'setcooldown');
    const ok = await this.settings.setCooldown(
      BigInt(ctx.chat!.id),
      Number(arg),
    );
    await ctx.reply(
      ok
        ? `Кулдаун установлен: ${arg} сек.`
        : 'Укажите целое число секунд от 0 до 86400: /setcooldown 60',
    );
  }

  @Command('setbatch')
  async onSetBatch(@Ctx() ctx: Context): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    const arg = commandArg(ctx, 'setbatch');
    const ok = await this.settings.setMentionsPerBatch(
      BigInt(ctx.chat!.id),
      Number(arg),
    );
    await ctx.reply(
      ok
        ? `Размер пачки упоминаний: ${arg}.`
        : 'Укажите число от 1 до 10: /setbatch 5',
    );
  }

  @Command('ignore')
  async onIgnore(@Ctx() ctx: Context): Promise<void> {
    await this.toggleBlacklist(ctx, true);
  }

  @Command('unignore')
  async onUnignore(@Ctx() ctx: Context): Promise<void> {
    await this.toggleBlacklist(ctx, false);
  }

  private async toggleBlacklist(ctx: Context, value: boolean): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    const target = replyTarget(ctx);
    if (!target) {
      await ctx.reply('Ответьте этой командой на сообщение пользователя.');
      return;
    }
    await this.members.setBlacklisted(
      BigInt(ctx.chat!.id),
      fromUserInput(target),
      value,
    );
    const name = target.first_name ?? `id ${target.id}`;
    await ctx.reply(
      value
        ? `${name} больше не будет упоминаться в зове.`
        : `${name} снова участвует в зове.`,
    );
  }

  private async ensureAdmin(ctx: Context): Promise<boolean> {
    if (!isGroupChat(ctx) || !ctx.from) return false;
    if (!(await isChatAdmin(ctx.telegram, ctx.chat!.id, ctx.from.id))) {
      await ctx.reply('Менять настройки может только администратор чата.');
      return false;
    }
    return true;
  }
}

function isGroupChat(ctx: Context): boolean {
  const t = ctx.chat?.type;
  return t === 'group' || t === 'supergroup';
}
