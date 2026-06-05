# Mentions & batching (tag-everyone core)

## Two mention mechanisms

1. **Plain `@username`** in message text. Telegram auto-detects it as a `mention`
   entity and notifies the user — but only if they have a public username. No
   entities array needed; just put `@username` in the text.

2. **`text_mention` entity**. Links arbitrary display text to a `user.id`. Works
   for **any** user, including those without a username. This is what a reliable
   "zazyvala" must use.

```ts
type MentionPart = { name: string; userId: number };

function buildMentionMessage(parts: MentionPart[], header = '') {
  let text = header ? header + '\n' : '';
  const entities: any[] = [];
  for (const p of parts) {
    const offset = utf16Len(text);            // offset in UTF-16 code units
    const chunk = p.name + ' ';
    text += chunk;
    entities.push({
      type: 'text_mention',
      offset,
      length: utf16Len(p.name),
      user: { id: p.userId, is_bot: false, first_name: p.name },
    });
  }
  return { text: text.trimEnd(), entities };
}

// Telegram entity offsets/lengths are counted in UTF-16 code units, NOT JS
// string .length for astral chars and NOT code points. For emoji/astral chars
// use the string's .length (JS strings are UTF-16) — that already matches.
function utf16Len(s: string): number {
  return s.length; // JS string length == UTF-16 code units
}
```

## Hard limits to respect

| Limit | Value | Consequence |
|-------|-------|-------------|
| Message length | 4096 chars | API rejects longer |
| Entities per message | ~100 | extra entities ignored |
| Notifying mentions per message | ~5 effectively | beyond that users are linked but may not get a push |
| Global send rate | ~30 msg/s; ~1 msg/s to same chat | 429 flood control |

Because only a handful of mentions actually *notify* per message, "tag everyone"
is implemented as **many small batched messages**, each mentioning a few users.

## Batching helper

```ts
const MENTIONS_PER_BATCH = 5;        // tune: notify-reliable size
const INTER_BATCH_DELAY_MS = 1200;   // ~<1 msg/s per chat

async function summonAll(
  telegram: Telegram,
  chatId: number,
  members: MentionPart[],
  header: string,
) {
  for (let i = 0; i < members.length; i += MENTIONS_PER_BATCH) {
    const batch = members.slice(i, i + MENTIONS_PER_BATCH);
    const isFirst = i === 0;
    const { text, entities } = buildMentionMessage(batch, isFirst ? header : '');
    await sendWithRetry(() => telegram.sendMessage(chatId, text, { entities }));
    await sleep(INTER_BATCH_DELAY_MS);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

## Retry with backoff (429 / flood)

```ts
async function sendWithRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let n = 0; ; n++) {
    try {
      return await fn();
    } catch (err: any) {
      const retryAfter = err?.response?.parameters?.retry_after;
      const is429 = err?.response?.error_code === 429;
      if (is429 && n < attempts) {
        await sleep((retryAfter ?? 1) * 1000 + 250);
        continue;
      }
      throw err; // non-flood error or out of attempts -> let caller log it
    }
  }
}
```

## Notes

- A user who blocked the bot or a deactivated account throws on send — catch per
  batch so one bad user does not abort the whole summon (partial success).
- Persist a per-chat **cooldown** between summons to prevent spam.
- For very large chats, run the summon in the background (queue) so the handler
  returns immediately and the event loop is not blocked.
