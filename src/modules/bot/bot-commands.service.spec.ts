import { Telegraf } from 'telegraf';
import { CommandRegistry, DEFAULT_COMMANDS } from './command-registry';
import { Context } from './context.interface';
import { BotCommandsService } from './bot-commands.service';

describe('BotCommandsService', () => {
  function make(setMyCommands: jest.Mock, registry: Partial<CommandRegistry>) {
    const bot = { telegram: { setMyCommands } } as unknown as Telegraf<Context>;
    return new BotCommandsService(bot, registry as CommandRegistry);
  }

  it('registers the registry command list on init', async () => {
    const setMyCommands = jest.fn().mockResolvedValue(true);
    await make(setMyCommands, {
      list: () => DEFAULT_COMMANDS,
      configured: false,
    }).onModuleInit();
    expect(setMyCommands).toHaveBeenCalledWith(DEFAULT_COMMANDS);
  });

  it('does not throw when setMyCommands fails', async () => {
    const setMyCommands = jest.fn().mockRejectedValue(new Error('network'));
    await expect(
      make(setMyCommands, {
        list: () => DEFAULT_COMMANDS,
        configured: false,
      }).onModuleInit(),
    ).resolves.toBeUndefined();
  });
});
