import type { MessageEntity } from 'telegraf/typings/core/types/typegram';

export interface MentionTarget {
  userId: bigint;
  name: string;
}

export interface MentionMessage {
  text: string;
  entities: MessageEntity[];
}

/**
 * Строит сообщение-зов с упоминаниями через text_mention.
 * text_mention работает для любого пользователя (даже без username).
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

  for (const target of targets) {
    const offset = text.length; // UTF-16 code units
    const chunk = `${target.name} `;
    text += chunk;
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
  }

  return { text: text.trimEnd(), entities };
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
