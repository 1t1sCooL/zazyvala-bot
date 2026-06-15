import { Logger } from '@nestjs/common';
import { Command, Ctx, On, Update } from 'nestjs-telegraf';
import type { User as TgUser } from 'telegraf/typings/core/types/typegram';
import { ChatsService } from '../chats';
import { EnsureUserInput, MembersService } from '../members';
import { requireGroup } from './command-args';
import { Context } from './context.interface';

/**
 * Тонкие хендлеры регистрации участников. Только разбор апдейта и вызов
 * доменных сервисов (ChatsService/MembersService) — без бизнес-логики.
 */
@Update()
export class MembershipUpdate {
  private readonly logger = new Logger(MembershipUpdate.name);

  constructor(
    private readonly chats: ChatsService,
    private readonly members: MembersService,
  ) {}

  @On('new_chat_members')
  async onNewMembers(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    if (!chat) return;

    await this.chats.ensureChat({
      id: BigInt(chat.id),
      type: chat.type,
      title: 'title' in chat ? chat.title : undefined,
    });

    const message = ctx.message as { new_chat_members?: TgUser[] } | undefined;
    const newMembers = message?.new_chat_members ?? [];
    for (const user of newMembers) {
      if (user.is_bot) continue;
      await this.members.registerMember(BigInt(chat.id), toUserInput(user));
    }
    this.logger.debug(
      `new_chat_members in chat ${chat.id}: ${newMembers.length}`,
    );
  }

  @On('left_chat_member')
  async onLeftMember(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    if (!chat) return;

    const message = ctx.message as { left_chat_member?: TgUser } | undefined;
    const user = message?.left_chat_member;
    if (!user || user.is_bot) return;

    await this.members.markLeft(BigInt(chat.id), BigInt(user.id));
    this.logger.debug(`left_chat_member ${user.id} in chat ${chat.id}`);
  }

  // При апгрейде группы до супергруппы Telegram меняет chat id; без переноса
  // весь реестр участников остаётся под старым id и /call зовёт «никого».
  @On('migrate_to_chat_id')
  async onMigrateTo(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    const message = ctx.message as { migrate_to_chat_id?: number } | undefined;
    const newId = message?.migrate_to_chat_id;
    if (!chat || !newId) return;

    this.logger.log(`[FIX] migrate_to_chat_id: ${chat.id} -> ${newId}`);
    await this.chats.migrateChat(BigInt(chat.id), BigInt(newId));
  }

  // Зеркальное сервисное сообщение в новой супергруппе (порядок доставки
  // двух сообщений о миграции не гарантирован; migrateChat идемпотентен).
  @On('migrate_from_chat_id')
  async onMigrateFrom(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    const message = ctx.message as
      | { migrate_from_chat_id?: number }
      | undefined;
    const oldId = message?.migrate_from_chat_id;
    if (!chat || !oldId) return;

    this.logger.log(`[FIX] migrate_from_chat_id: ${oldId} -> ${chat.id}`);
    await this.chats.migrateChat(BigInt(oldId), BigInt(chat.id));
  }

  // Авто-регистрация по активности вынесена в сквозной middleware
  // (createActivityMiddleware), чтобы не блокировать цепочку команд.

  @Command('join')
  async onJoin(@Ctx() ctx: Context): Promise<void> {
    if (!(await requireGroup(ctx)) || !ctx.from) return;
    const chat = ctx.chat!;
    const from = ctx.from;

    await this.chats.ensureChat({
      id: BigInt(chat.id),
      type: chat.type,
      title: 'title' in chat ? chat.title : undefined,
    });
    await this.members.setSubscribed(BigInt(chat.id), toUserInput(from), true);
    this.logger.debug(`/join ${from.id} in chat ${chat.id}`);
    await ctx.reply('Готово! Теперь я буду звать тебя. Отписаться — /leave');
  }

  @Command('leave')
  async onLeave(@Ctx() ctx: Context): Promise<void> {
    if (!(await requireGroup(ctx)) || !ctx.from) return;
    const chat = ctx.chat!;
    const from = ctx.from;

    await this.members.setSubscribed(BigInt(chat.id), toUserInput(from), false);
    this.logger.debug(`/leave ${from.id} in chat ${chat.id}`);
    await ctx.reply('Ок, больше не буду звать. Вернуться — /join');
  }
}

function toUserInput(user: TgUser): EnsureUserInput {
  return {
    id: BigInt(user.id),
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    isBot: user.is_bot,
  };
}
