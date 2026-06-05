import { Logger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotMode } from '../../shared/config/env.validation';
import { TelegrafExceptionFilter } from '../../shared/filters/telegraf-exception.filter';
import { AssistantsModule } from '../assistants';
import { ChatsModule, ChatsService } from '../chats';
import { MembersModule, MembersService } from '../members';
import { SettingsModule } from '../settings';
import { SummonModule } from '../summon';
import { TagGroupsModule } from '../tag-groups';
import { createActivityMiddleware } from './activity.middleware';
import { createCommandGateMiddleware } from './command-gate.middleware';
import { CommandRegistry, CommandRegistryModule } from './command-registry';
import { BotCommandsService } from './bot-commands.service';
import { AssistantsUpdate } from './assistants.update';
import { BotUpdate } from './bot.update';
import { MembershipUpdate } from './membership.update';
import { SettingsUpdate } from './settings.update';
import { SummonUpdate } from './summon.update';
import { TagGroupsUpdate } from './tag-groups.update';

/**
 * Presentation-слой Telegram. Подключает nestjs-telegraf и регистрирует хендлеры.
 * Режим связи (long polling / webhook) переключается через BOT_MODE.
 */
@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [
        ConfigModule,
        ChatsModule,
        MembersModule,
        CommandRegistryModule,
      ],
      inject: [ConfigService, ChatsService, MembersService, CommandRegistry],
      useFactory: (
        config: ConfigService,
        chats: ChatsService,
        members: MembersService,
        registry: CommandRegistry,
      ) => {
        const logger = new Logger('BotModule');
        const token = config.getOrThrow<string>('BOT_TOKEN');
        const mode = config.get<BotMode>('BOT_MODE', BotMode.Polling);

        logger.debug(`Initializing Telegram bot in "${mode}" mode`);

        // Сквозные middleware (bot.use) — до хендлеров команд, всегда next():
        //  1) авто-регистрация участников;
        //  2) гейт команд по белому списку BOT_COMMANDS.
        const middlewares = [
          createActivityMiddleware(chats, members),
          createCommandGateMiddleware(registry),
        ];

        if (mode === BotMode.Webhook) {
          const domain = config.getOrThrow<string>('BOT_WEBHOOK_DOMAIN');
          return {
            token,
            middlewares,
            launchOptions: {
              webhook: {
                domain,
                path: '/telegram/webhook',
              },
            },
          };
        }

        // Long polling (по умолчанию, для разработки).
        return { token, middlewares };
      },
    }),
    CommandRegistryModule,
    ChatsModule,
    MembersModule,
    SettingsModule,
    SummonModule,
    AssistantsModule,
    TagGroupsModule,
  ],
  providers: [
    BotCommandsService,
    BotUpdate,
    MembershipUpdate,
    SummonUpdate,
    AssistantsUpdate,
    TagGroupsUpdate,
    SettingsUpdate,
    {
      provide: APP_FILTER,
      useClass: TelegrafExceptionFilter,
    },
  ],
})
export class BotModule {}
