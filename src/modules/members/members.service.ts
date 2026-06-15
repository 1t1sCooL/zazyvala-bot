import { Injectable, Logger } from '@nestjs/common';
import { ChatMember, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface EnsureUserInput {
  id: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isBot?: boolean;
}

export type ChatMemberWithUser = ChatMember & { user: User };

export type AddByUsernameResult =
  | { resolved: true; member: ChatMember }
  | { resolved: false; username: string };

/** Результат мутации существующего участника (правка флагов/удаление). */
export type MemberMutationResult = { status: 'ok' | 'not_found' };

/** Частичная правка флагов участника из админки. */
export interface MemberFlagsPatch {
  subscribed?: boolean;
  blacklisted?: boolean;
}

/** Нормализует @username: без @, в нижнем регистре. null — если невалидный. */
export function normalizeUsername(raw: string): string | null {
  const username = raw.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z0-9_]{5,32}$/.test(username) ? username : null;
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Создаёт/обновляет глобальную запись пользователя Telegram. */
  async ensureUser(input: EnsureUserInput): Promise<User> {
    return this.prisma.user.upsert({
      where: { id: input.id },
      update: {
        username: input.username ?? undefined,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        isBot: input.isBot ?? undefined,
      },
      create: {
        id: input.id,
        username: input.username ?? undefined,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        isBot: input.isBot ?? false,
      },
    });
  }

  /** Регистрирует участника чата как активного (создаёт user при необходимости). */
  async registerMember(
    chatId: bigint,
    user: EnsureUserInput,
  ): Promise<ChatMember> {
    await this.ensureUser(user);

    const member = await this.prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      update: { status: 'active', leftAt: null },
      create: {
        chatId,
        userId: user.id,
        status: 'active',
        subscribed: true,
      },
    });

    // Пользователь «объявился»: если его добавляли по @username, отложенная
    // запись больше не нужна — дальше зовём по id с именем и фамилией.
    if (user.username) {
      const claimed = await this.prisma.pendingMember.deleteMany({
        where: { chatId, username: user.username.toLowerCase() },
      });
      if (claimed.count > 0) {
        this.logger.log(
          `Pending @${user.username} claimed by user ${user.id} in chat ${chatId}`,
        );
      }
    }

    this.logger.debug(`Registered member ${user.id} in chat ${chatId}`);
    return member;
  }

  /**
   * Добавляет участника по @username (из админки). Если бот уже знает
   * пользователя с таким username — сразу регистрирует полноценного участника;
   * иначе создаёт отложенную запись, которую заберёт первый же его апдейт.
   */
  async addByUsername(
    chatId: bigint,
    rawUsername: string,
  ): Promise<AddByUsernameResult> {
    const username = normalizeUsername(rawUsername);
    if (!username) {
      throw new Error(`Invalid username: ${rawUsername}`);
    }

    const known = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        isBot: false,
      },
    });
    if (known) {
      const member = await this.registerMember(chatId, known);
      return { resolved: true, member };
    }

    await this.prisma.pendingMember.upsert({
      where: { chatId_username: { chatId, username } },
      update: {},
      create: { chatId, username },
    });
    this.logger.log(`Added pending member @${username} in chat ${chatId}`);
    return { resolved: false, username };
  }

  /**
   * Конвертирует отложенные @username-записи чата, чьих владельцев бот уже
   * встречал (например, в другом чате), в полноценных участников.
   */
  async resolvePending(chatId: bigint): Promise<void> {
    const pending = await this.prisma.pendingMember.findMany({
      where: { chatId },
    });
    for (const p of pending) {
      const known = await this.prisma.user.findFirst({
        where: {
          username: { equals: p.username, mode: 'insensitive' },
          isBot: false,
        },
      });
      // registerMember сам удалит отложенную запись (клейм по username).
      if (known) await this.registerMember(chatId, known);
    }
  }

  /** @username-участники чата, ещё не сопоставленные с Telegram id. */
  async listPendingUsernames(chatId: bigint): Promise<string[]> {
    const pending = await this.prisma.pendingMember.findMany({
      where: { chatId },
      orderBy: { addedAt: 'asc' },
    });
    return pending.map((p) => p.username);
  }

  /** Удаляет отложенную @username-запись (правка ошибочного добавления). */
  async removePendingByUsername(
    chatId: bigint,
    rawUsername: string,
  ): Promise<boolean> {
    const username = normalizeUsername(rawUsername);
    if (!username) return false;
    const res = await this.prisma.pendingMember.deleteMany({
      where: { chatId, username },
    });
    return res.count > 0;
  }

  /** Помечает участника ушедшим (idempotent — не падает, если записи нет). */
  async markLeft(chatId: bigint, userId: bigint): Promise<void> {
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId },
      data: { status: 'left', leftAt: new Date() },
    });
    this.logger.debug(`Marked member ${userId} left in chat ${chatId}`);
  }

  /** Переключает подписку участника на зов (opt-in/opt-out). */
  async setSubscribed(
    chatId: bigint,
    user: EnsureUserInput,
    subscribed: boolean,
  ): Promise<ChatMember> {
    await this.ensureUser(user);

    const member = await this.prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      update: { subscribed, status: 'active', leftAt: null },
      create: {
        chatId,
        userId: user.id,
        status: 'active',
        subscribed,
      },
    });

    this.logger.debug(
      `Set subscribed=${subscribed} for member ${user.id} in chat ${chatId}`,
    );
    return member;
  }

  /** Активные подписанные участники чата (кроме blacklist) — кандидаты для зова. */
  async listActiveSubscribed(chatId: bigint): Promise<ChatMemberWithUser[]> {
    return this.prisma.chatMember.findMany({
      where: {
        chatId,
        status: 'active',
        subscribed: true,
        blacklisted: false,
      },
      include: { user: true },
    });
  }

  /**
   * Частично правит флаги УЖЕ существующего участника (из админки): подписка
   * на зов и/или blacklist. В отличие от setSubscribed/setBlacklisted не делает
   * upsert — несуществующего участника не создаёт, а возвращает not_found.
   */
  async updateMemberFlags(
    chatId: bigint,
    userId: bigint,
    patch: MemberFlagsPatch,
  ): Promise<MemberMutationResult> {
    const data: MemberFlagsPatch = {};
    if (patch.subscribed !== undefined) data.subscribed = patch.subscribed;
    if (patch.blacklisted !== undefined) data.blacklisted = patch.blacklisted;

    // Нечего менять — просто сообщаем, существует ли участник.
    if (Object.keys(data).length === 0) {
      const exists = await this.prisma.chatMember.count({
        where: { chatId, userId },
      });
      return { status: exists > 0 ? 'ok' : 'not_found' };
    }

    const res = await this.prisma.chatMember.updateMany({
      where: { chatId, userId },
      data,
    });
    this.logger.debug(
      `Updated member ${userId} flags in chat ${chatId}: ` +
        `${JSON.stringify(data)} (count ${res.count})`,
    );
    return { status: res.count > 0 ? 'ok' : 'not_found' };
  }

  /** Жёстко удаляет участника из реестра чата (правка из админки). */
  async removeMember(
    chatId: bigint,
    userId: bigint,
  ): Promise<MemberMutationResult> {
    const res = await this.prisma.chatMember.deleteMany({
      where: { chatId, userId },
    });
    this.logger.log(
      `Removed member ${userId} from chat ${chatId} (count ${res.count})`,
    );
    return { status: res.count > 0 ? 'ok' : 'not_found' };
  }

  /** Включает/выключает исключение участника из зова (blacklist). */
  async setBlacklisted(
    chatId: bigint,
    user: EnsureUserInput,
    value: boolean,
  ): Promise<void> {
    await this.ensureUser(user);
    await this.prisma.chatMember.upsert({
      where: { chatId_userId: { chatId, userId: user.id } },
      update: { blacklisted: value },
      create: {
        chatId,
        userId: user.id,
        status: 'active',
        blacklisted: value,
      },
    });
    this.logger.debug(
      `Set blacklisted=${value} for member ${user.id} in chat ${chatId}`,
    );
  }
}
