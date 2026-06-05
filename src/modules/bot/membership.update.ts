import { Logger } from '@nestjs/common';
import { Command, Ctx, On, Update } from 'nestjs-telegraf';
import type { User as TgUser } from 'telegraf/typings/core/types/typegram';
import { ChatsService } from '../chats';
import { EnsureUserInput, MembersService } from '../members';
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

    await this.chats.ensureChat({ id: BigInt(chat.id), type: chat.type });

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

  /** Авто-регистрация по активности в группе. */
  @On('message')
  async onMessage(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    const from = ctx.from;
    if (!chat || !from || from.is_bot) return;
    if (chat.type !== 'group' && chat.type !== 'supergroup') return;

    await this.chats.ensureChat({ id: BigInt(chat.id), type: chat.type });
    await this.members.registerMember(BigInt(chat.id), toUserInput(from));
  }

  @Command('join')
  async onJoin(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    const from = ctx.from;
    if (!chat || !from) return;

    await this.chats.ensureChat({ id: BigInt(chat.id), type: chat.type });
    await this.members.setSubscribed(BigInt(chat.id), toUserInput(from), true);
    this.logger.debug(`/join ${from.id} in chat ${chat.id}`);
    await ctx.reply('Готово! Теперь я буду звать тебя. Отписаться — /leave');
  }

  @Command('leave')
  async onLeave(@Ctx() ctx: Context): Promise<void> {
    const chat = ctx.chat;
    const from = ctx.from;
    if (!chat || !from) return;

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
