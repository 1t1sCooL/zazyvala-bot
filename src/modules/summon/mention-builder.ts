import type { MessageEntity } from 'telegraf/typings/core/types/typegram';

/**
 * Цель упоминания: пользователь с известным id (text_mention по имени)
 * или добавленный по @username, чей id бот ещё не узнал (mention).
 */
export type MentionTarget =
  | { userId: bigint; name: string }
  | { username: string };

export interface MentionMessage {
  text: string;
  entities: MessageEntity[];
}

const SEPARATOR = ', ';

/**
 * Строит сообщение-зов. Участники разделяются запятыми.
 * - id-цели — text_mention (работает для любого пользователя, даже без username);
 * - @username-цели — entity типа mention (Telegram уведомит владельца username).
 *
 * Важно: offset/length у Telegram считаются в UTF-16 code units.
 * JS-строки и есть UTF-16, поэтому String.length подходит напрямую.
 */
export function buildMentionMessage(
  targets: MentionTarget[],
  header?: string,
): MentionMessage {
  let text = header ? `${header}\n` : '';
  const entities: MessageEntity[] = [];

  targets.forEach((target, i) => {
    if (i > 0) text += SEPARATOR;
    const offset = text.length; // UTF-16 code units

    if ('userId' in target) {
      text += target.name;
      entities.push({
        type: 'text_mention',
        offset,
        length: target.name.length,
        user: {
          id: Number(target.userId),
          is_bot: false,
          first_name: target.name,
        },
      });
    } else {
      const mention = `@${target.username}`;
      text += mention;
      entities.push({ type: 'mention', offset, length: mention.length });
    }
  });

  return { text, entities };
}

/** Разбивает список на батчи фиксированного размера. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
