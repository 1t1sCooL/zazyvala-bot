import { Logger } from '@nestjs/common';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import type { User as TgUser } from 'telegraf/typings/core/types/typegram';
import { AssistantsService } from '../assistants';
import { MembersService } from '../members';
import { requireGroup } from './command-args';
import { Context } from './context.interface';
import { isChatAdmin } from './is-chat-admin';

/**
 * Управление помощниками. Доступно только админам чата.
 * Цель команды — пользователь из reply_to_message.
 */
@Update()
export class AssistantsUpdate {
  private readonly logger = new Logger(AssistantsUpdate.name);

  constructor(
    private readonly assistants: AssistantsService,
    private readonly members: MembersService,
  ) {}

  @Command('addhelper')
  async onAdd(@Ctx() ctx: Context): Promise<void> {
    if (!(await this.ensureGroupAdmin(ctx))) return;

    const target = replyTarget(ctx);
    if (!target) {
      await ctx.reply('Ответьте этой командой на сообщение пользователя.');
      return;
    }
    if (target.is_bot) {
      await ctx.reply('Бота нельзя назначить помощником.');
      return;
    }

    const chatId = BigInt(ctx.chat!.id);
    await this.members.ensureUser({
      id: BigInt(target.id),
      username: target.username,
      firstName: target.first_name,
      lastName: target.last_name,
      isBot: target.is_bot,
    });

    const res = await this.assistants.add(
      chatId,
      BigInt(target.id),
      BigInt(ctx.from!.id),
    );
    this.logger.debug(
      `/addhelper ${target.id} in chat ${chatId}: ${res.status}`,
    );

    const name = displayName(target);
    switch (res.status) {
      case 'ok':
        await ctx.reply(`Готово — ${name} теперь помощник.`);
        break;
      case 'exists':
        await ctx.reply(`${name} уже помощник.`);
        break;
      case 'limit':
        await ctx.reply(
          `Достигнут лимит помощников (${res.max}). Сначала удалите кого-то: /delhelper`,
        );
        break;
    }
  }

  @Command('delhelper')
  async onDel(@Ctx() ctx: Context): Promise<void> {
    if (!(await this.ensureGroupAdmin(ctx))) return;

    const target = replyTarget(ctx);
    if (!target) {
      await ctx.reply('Ответьте этой командой на сообщение помощника.');
      return;
    }

    const res = await this.assistants.remove(
      BigInt(ctx.chat!.id),
      BigInt(target.id),
    );
    this.logger.debug(
      `/delhelper ${target.id} in chat ${ctx.chat!.id}: ${res.status}`,
    );

    await ctx.reply(
      res.status === 'ok'
        ? `${displayName(target)} больше не помощник.`
        : `${displayName(target)} не был помощником.`,
    );
  }

  @Command('helpers')
  async onList(@Ctx() ctx: Context): Promise<void> {
    if (!(await requireGroup(ctx))) return;
    const chat = ctx.chat!;

    const list = await this.assistants.listWithUsers(BigInt(chat.id));
    if (list.length === 0) {
      await ctx.reply(
        'Помощников пока нет. Назначить: ответьте на сообщение и /addhelper',
      );
      return;
    }

    const lines = list.map((a) => {
      const name =
        a.user?.firstName ??
        (a.user?.username ? `@${a.user.username}` : `id ${a.userId}`);
      return `• ${name}`;
    });
    await ctx.reply(`Помощники:\n${lines.join('\n')}`);
  }

  /** Возвращает true, если команда вызвана в группе её админом. */
  private async ensureGroupAdmin(ctx: Context): Promise<boolean> {
    const chat = ctx.chat;
    const from = ctx.from;
    if (!chat || !from) return false;
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      await ctx.reply('Команда работает только в групповом чате.');
      return false;
    }
    if (!(await isChatAdmin(ctx.telegram, chat.id, from.id))) {
      await ctx.reply('Только администратор чата может управлять помощниками.');
      return false;
    }
    return true;
  }
}

function replyTarget(ctx: Context): TgUser | undefined {
  const message = ctx.message as
    | { reply_to_message?: { from?: TgUser } }
    | undefined;
  return message?.reply_to_message?.from;
}

function displayName(user: TgUser): string {
  return (
    user.first_name ?? (user.username ? `@${user.username}` : `id ${user.id}`)
  );
}
