import { Logger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotMode } from '../../shared/config/env.validation';
import { TelegrafExceptionFilter } from '../../shared/filters/telegraf-exception.filter';
import { AssistantsModule } from '../assistants';
import { ChatsModule } from '../chats';
import { MembersModule } from '../members';
import { SettingsModule } from '../settings';
import { SummonModule } from '../summon';
import { TagGroupsModule } from '../tag-groups';
import { AssistantsUpdate } from './assistants.update';
import { BotUpdate } from './bot.update';
import { MembershipUpdate } from './membership.update';
import { SummonUpdate } from './summon.update';
import { TagGroupsUpdate } from './tag-groups.update';

/**
 * Presentation-слой Telegram. Подключает nestjs-telegraf и регистрирует хендлеры.
 * Режим связи (long polling / webhook) переключается через BOT_MODE.
 */
@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('BotModule');
        const token = config.getOrThrow<string>('BOT_TOKEN');
        const mode = config.get<BotMode>('BOT_MODE', BotMode.Polling);

        logger.debug(`Initializing Telegram bot in "${mode}" mode`);

        if (mode === BotMode.Webhook) {
          const domain = config.getOrThrow<string>('BOT_WEBHOOK_DOMAIN');
          return {
            token,
            launchOptions: {
              webhook: {
                domain,
                path: '/telegram/webhook',
              },
            },
          };
        }

        // Long polling (по умолчанию, для разработки).
        return { token };
      },
    }),
    ChatsModule,
    MembersModule,
    SettingsModule,
    SummonModule,
    AssistantsModule,
    TagGroupsModule,
  ],
  providers: [
    BotUpdate,
    MembershipUpdate,
    SummonUpdate,
    AssistantsUpdate,
    TagGroupsUpdate,
    {
      provide: APP_FILTER,
      useClass: TelegrafExceptionFilter,
    },
  ],
})
export class BotModule {}
