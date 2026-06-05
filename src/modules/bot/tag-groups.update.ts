import { Logger } from '@nestjs/common';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { TagGroupsService } from '../tag-groups';
import { Context } from './context.interface';
import { isChatAdmin } from './is-chat-admin';
import { commandArg, fromUserInput, requireGroup } from './command-args';

/**
 * Управление кастомными группами тегов. Создание/удаление — админ;
 * вступление/выход — любой участник.
 */
@Update()
export class TagGroupsUpdate {
  private readonly logger = new Logger(TagGroupsUpdate.name);

  constructor(private readonly groups: TagGroupsService) {}

  @Command('groups')
  async onList(@Ctx() ctx: Context): Promise<void> {
    if (!(await requireGroup(ctx))) return;
    const list = await this.groups.list(BigInt(ctx.chat!.id));
    if (list.length === 0) {
      await ctx.reply('Групп тегов пока нет. Создать: /newgroup <имя> (админ)');
      return;
    }
    const lines = list.map((g) => `• ${g.name} (${g.count})`);
    await ctx.reply(`Группы тегов:\n${lines.join('\n')}\n\nЗвать: /call <имя>`);
  }

  @Command('newgroup')
  async onNew(@Ctx() ctx: Context): Promise<void> {
    if (!(await this.ensureGroupAdmin(ctx))) return;
    const name = commandArg(ctx, 'newgroup');
    if (!name) {
      await ctx.reply('Укажите имя: /newgroup <имя>');
      return;
    }
    const res = await this.groups.create(BigInt(ctx.chat!.id), name);
    await ctx.reply(
      res.status === 'ok'
        ? `Группа «${name}» создана. Вступить: /joingroup ${name}`
        : `Группа «${name}» уже существует.`,
    );
  }

  @Command('delgroup')
  async onDel(@Ctx() ctx: Context): Promise<void> {
    if (!(await this.ensureGroupAdmin(ctx))) return;
    const name = commandArg(ctx, 'delgroup');
    if (!name) {
      await ctx.reply('Укажите имя: /delgroup <имя>');
      return;
    }
    const res = await this.groups.remove(BigInt(ctx.chat!.id), name);
    await ctx.reply(
      res.status === 'ok'
        ? `Группа «${name}» удалена.`
        : `Группы «${name}» не существует.`,
    );
  }

  @Command('joingroup')
  async onJoin(@Ctx() ctx: Context): Promise<void> {
    if (!(await requireGroup(ctx)) || !ctx.from) return;
    const name = commandArg(ctx, 'joingroup');
    if (!name) {
      await ctx.reply('Укажите имя: /joingroup <имя>');
      return;
    }
    const res = await this.groups.addMember(
      BigInt(ctx.chat!.id),
      name,
      fromUserInput(ctx.from),
    );
    switch (res.status) {
      case 'ok':
        await ctx.reply(`Вы в группе «${name}».`);
        break;
      case 'exists':
        await ctx.reply(`Вы уже в группе «${name}».`);
        break;
      case 'no_group':
        await ctx.reply(`Группы «${name}» нет. Создать: /newgroup ${name}`);
        break;
    }
  }

  @Command('leavegroup')
  async onLeave(@Ctx() ctx: Context): Promise<void> {
    if (!(await requireGroup(ctx)) || !ctx.from) return;
    const name = commandArg(ctx, 'leavegroup');
    if (!name) {
      await ctx.reply('Укажите имя: /leavegroup <имя>');
      return;
    }
    const res = await this.groups.removeMember(
      BigInt(ctx.chat!.id),
      name,
      BigInt(ctx.from.id),
    );
    switch (res.status) {
      case 'ok':
        await ctx.reply(`Вы вышли из группы «${name}».`);
        break;
      case 'not_member':
        await ctx.reply(`Вы не состоите в группе «${name}».`);
        break;
      case 'no_group':
        await ctx.reply(`Группы «${name}» нет.`);
        break;
    }
  }

  private async ensureGroupAdmin(ctx: Context): Promise<boolean> {
    if (!(await requireGroup(ctx)) || !ctx.from) return false;
    if (!(await isChatAdmin(ctx.telegram, ctx.chat!.id, ctx.from.id))) {
      await ctx.reply('Создавать и удалять группы может только администратор.');
      return false;
    }
    return true;
  }
}
