# Scenes & Wizard flows

Scenes give multi-step dialogs (e.g. "create a custom tag group" wizard). They
require Telegraf `session()` middleware and a registered stage.

## Session typing

```ts
// context.interface.ts
import { Context as TelegrafContext } from 'telegraf';
import { SceneContextScene, WizardContextWizard } from 'telegraf/typings/scenes';

export interface Context extends TelegrafContext {
  scene: SceneContextScene<Context>;
  wizard: WizardContextWizard<Context>;
}
```

## Registering scenes (module)

`nestjs-telegraf` wires session + stage when you pass `middlewares` / register the
scene providers. Add `session()` via the module options and declare scene classes
as providers in your `BotModule`.

```ts
// app.module.ts (excerpt)
import { session } from 'telegraf';

TelegrafModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    token: config.getOrThrow('BOT_TOKEN'),
    middlewares: [session()], // enables ctx.session & scenes
  }),
});
```

```ts
// bot.module.ts
@Module({
  providers: [BotUpdate, CreateGroupScene, SummonService /* ... */],
})
export class BotModule {}
```

## A simple scene (@Scene)

```ts
import { Scene, SceneEnter, On, Ctx } from 'nestjs-telegraf';
import { Context } from './context.interface';

@Scene('create-group')
export class CreateGroupScene {
  constructor(private readonly groups: TagGroupsService) {}

  @SceneEnter()
  async onEnter(@Ctx() ctx: Context) {
    await ctx.reply('Введите название новой группы тегов:');
  }

  @On('text')
  async onName(@Ctx() ctx: Context) {
    const name = (ctx.message as any).text?.trim();
    if (!name) {
      await ctx.reply('Название не может быть пустым. Повторите:');
      return;
    }
    await this.groups.create(ctx.chat!.id, name);
    await ctx.reply(`Группа «${name}» создана.`);
    await ctx.scene.leave();
  }
}
```

## Entering a scene from a command

```ts
@Command('newgroup')
async onNewGroup(@Ctx() ctx: Context) {
  await ctx.scene.enter('create-group');
}
```

## Wizard scene (numbered steps)

```ts
import { Wizard, WizardStep, Ctx } from 'nestjs-telegraf';

@Wizard('onboarding')
export class OnboardingWizard {
  @WizardStep(1)
  async step1(@Ctx() ctx: Context) {
    await ctx.reply('Шаг 1: ...');
    ctx.wizard.next();
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: Context) {
    await ctx.reply('Шаг 2: ...');
    await ctx.scene.leave();
  }
}
```

## Notes

- Scene state lives in `ctx.session` — for multi-instance/prod use a persistent
  session store (e.g. `@telegraf/session` with Redis/Postgres) instead of the
  in-memory default.
- Always provide an escape (`/cancel` → `ctx.scene.leave()`).
