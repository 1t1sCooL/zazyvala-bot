import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { CommandRegistry } from './command-registry';
import { Context } from './context.interface';

/**
 * Регистрирует меню команд бота (setMyCommands) из CommandRegistry — чтобы при
 * вводе "/" Telegram показывал актуальный список (env-белый список или дефолт).
 */
@Injectable()
export class BotCommandsService implements OnModuleInit {
  private readonly logger = new Logger(BotCommandsService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly registry: CommandRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    const commands = this.registry.list();
    const source = this.registry.configured ? 'env' : 'default';
    try {
      await this.bot.telegram.setMyCommands(commands);
      this.logger.log(
        `Registered ${commands.length} bot commands (source: ${source})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to set bot commands: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
