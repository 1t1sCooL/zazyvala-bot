---
name: nestjs-telegraf
description: >-
  Build Telegram bots with NestJS using nestjs-telegraf (Telegraf v4 wrapper).
  Use when writing or reviewing bot update handlers, wiring TelegrafModule
  (forRoot/forRootAsync), using decorators (@Update, @Ctx, @Start, @Command,
  @On, @Hears, @Action, @InjectBot), scenes/wizard flows, middleware, handling
  group updates (new_chat_members/left_chat_member), mentioning users via
  message entities, batching mentions under Telegram limits, choosing long
  polling vs webhook, or handling Telegram errors and rate limits (429/flood).
  Triggers on "telegraf", "nestjs-telegraf", "@Update", "@Ctx", "telegram bot",
  "tag all", "mention users", "webhook", "flood control".
metadata:
  author: aif-skill-generator
  version: "1.0"
  category: backend
---

# nestjs-telegraf — Telegram bots on NestJS

Production patterns for `nestjs-telegraf` (wraps **Telegraf v4**). Keep Telegram
handlers thin: decode the update, call a domain service, reply. Business logic
lives in injectable services, never in `@Update` classes.

Package versions referenced: `nestjs-telegraf@^2.7`, `telegraf@^4.16`.

## 1. Module setup

Always configure async with `ConfigService`. Token from env, never hard-coded.

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.getOrThrow<string>('BOT_TOKEN'),
        // dev: long polling. Omit `launchOptions` to default to polling.
        launchOptions:
          config.get('BOT_MODE') === 'webhook'
            ? {
                webhook: {
                  domain: config.getOrThrow('BOT_WEBHOOK_DOMAIN'),
                  path: '/telegram/webhook',
                },
              }
            : undefined, // long polling
      }),
    }),
    BotModule,
  ],
})
export class AppModule {}
```

- **Long polling** (dev): no public URL needed; `launchOptions` undefined.
- **Webhook** (prod): set `launchOptions.webhook.domain` + `path`. Telegram pushes
  updates to `https://<domain><path>`. Set the webhook secret via Telegram and
  validate `X-Telegram-Bot-Api-Secret-Token` when terminating TLS yourself.
- Use `TelegrafModule.forRootAsync` only; do not mix `forRoot` static token.

## 2. Update handlers (the thin layer)

An `@Update()` class is a NestJS provider — full DI works.

```ts
// bot.update.ts
import { Update, Ctx, Start, Help, Command, On, Hears, InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Context } from './context.interface';
import { SummonService } from '../summon/summon.service';

@Update()
export class BotUpdate {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly summon: SummonService, // domain logic injected
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await ctx.reply('Привет! Добавь меня в группу и используй /call для зова.');
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply('/call <текст> — позвать всех. /join — подписаться. /leave — отписаться.');
  }

  @Command('call') // matches /call
  async onCall(@Ctx() ctx: Context) {
    await this.summon.callAll(ctx); // all logic in the service
  }

  @Hears(/^(зов|@all)/i) // regex on text
  async onHears(@Ctx() ctx: Context) {
    await this.summon.callAll(ctx);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    // track activity for opt-in registry, etc.
  }
}
```

Define a typed `Context` once and reuse it everywhere:

```ts
// context.interface.ts
import { Context as TelegrafContext } from 'telegraf';
export interface Context extends TelegrafContext {
  // augment with session/scene types if used
}
```

Decorator cheatsheet:

| Decorator | Fires on |
|-----------|----------|
| `@Start()` / `@Help()` | `/start`, `/help` |
| `@Command('name')` | `/name` |
| `@Hears(string \| RegExp)` | text matches |
| `@On('text' \| 'new_chat_members' \| 'callback_query' \| ...)` | update type |
| `@Action(string \| RegExp)` | inline button `callback_query` data |
| `@Ctx()` | injects the update context into a handler param |
| `@Message()`, `@Sender()` | inject parts of the update |

## 3. Group membership tracking

Telegram does not let a bot list all members. Build a registry from updates.

```ts
@On('new_chat_members')
async onJoin(@Ctx() ctx: Context) {
  const members = ctx.message?.new_chat_members ?? [];
  for (const u of members) {
    if (u.is_bot) continue;
    await this.members.upsert(ctx.chat.id, u); // persist via Prisma service
  }
}

@On('left_chat_member')
async onLeave(@Ctx() ctx: Context) {
  const u = ctx.message?.left_chat_member;
  if (u) await this.members.markLeft(ctx.chat.id, u.id);
}
```

Also upsert on any `@On('text')`/message to catch members who were already in the
chat before the bot joined (opt-in by activity). Offer `/join` and `/leave`.

## 4. Mentioning users — the core of a "tag" bot

Two ways to mention. See [references/mentions-and-batching.md](references/mentions-and-batching.md)
for the full rationale and limits.

- **@username** — works only if the user has a public username. Plain text
  `@durov` becomes a notifying mention automatically.
- **text_mention entity** — works for anyone (even without a username) by linking
  to their user id. Required for reliable "tag everyone".

```ts
// Build text + entities for users WITHOUT usernames:
const name = 'Иван';
const text = `${name} `;
const entities = [{
  type: 'text_mention',
  offset: 0,
  length: [...name].length, // length in UTF-16 code units — see reference note
  user: { id: userId, is_bot: false, first_name: name },
}];
await ctx.telegram.sendMessage(chatId, text, { entities });
```

**Batching is mandatory.** Telegram silently caps notifying mentions per message
(~5 effectively notify) and messages are limited to 4096 chars / 100 entities.
Split the member list into batches and send sequentially with a small delay.
Full helper in [references/mentions-and-batching.md](references/mentions-and-batching.md).

## 5. Scenes & wizard (multi-step flows)

Use scenes for setup dialogs (e.g. configuring a custom tag group). See
[references/scenes.md](references/scenes.md) for the complete example.

```ts
import { Scene, SceneEnter, On, Ctx } from 'nestjs-telegraf';
import { SceneContext } from 'telegraf/typings/scenes';

@Scene('create-group')
export class CreateGroupScene {
  @SceneEnter()
  async enter(@Ctx() ctx: SceneContext) {
    await ctx.reply('Название группы тегов?');
  }
  @On('text')
  async onName(@Ctx() ctx: SceneContext) {
    // save, then ctx.scene.leave()
    await ctx.scene.leave();
  }
}
```

Register `session()` middleware + `TelegrafModule` stage; details in the reference.

## 6. Middleware, guards, filters

`nestjs-telegraf` supports NestJS guards, interceptors, pipes and exception
filters on handlers. Use a guard for "who may summon" and a global Telegraf
exception filter for API errors.

```ts
bot.use(session());          // Telegraf middleware (for scenes)
@UseGuards(CanSummonGuard)   // NestJS guard on @Command('call')
```

## 7. Errors & rate limits (429 / flood control)

Telegram returns `429` with `parameters.retry_after` (seconds) under flood. Never
hammer; respect `retry_after`. Wrap sends in a retry-with-backoff helper and use a
small inter-batch delay. See [references/mentions-and-batching.md](references/mentions-and-batching.md)
for `sendWithRetry`. Add a global catch filter:

```ts
import { Catch, ArgumentsHost } from '@nestjs/common';
import { TelegrafArgumentsHost } from 'nestjs-telegraf';

@Catch()
export class TelegrafExceptionFilter {
  async catch(err: unknown, host: ArgumentsHost) {
    const ctx = TelegrafArgumentsHost.create(host).getContext<Context>();
    // log; optionally notify; never rethrow into the polling loop
  }
}
```

## Checklist when building a handler

- [ ] Handler is thin; logic in an injected service.
- [ ] Token & secrets from `ConfigService`, not literals.
- [ ] Group updates (`new_chat_members`/`left_chat_member`) update the registry.
- [ ] Mass mentions are batched and rate-limited.
- [ ] `text_mention` used for users without a username.
- [ ] Telegram errors caught; `retry_after` respected.
- [ ] Permission guard enforces who may trigger a summon.

## References

- [references/mentions-and-batching.md](references/mentions-and-batching.md) — mention entities, limits, batching, retry/backoff.
- [references/scenes.md](references/scenes.md) — scenes/wizard setup with session middleware.
