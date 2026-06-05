import { Telegraf } from 'telegraf';
import { Context } from './context.interface';
import { BotCommandsService } from './bot-commands.service';

describe('BotCommandsService', () => {
  function make(setMyCommands: jest.Mock) {
    const bot = { telegram: { setMyCommands } } as unknown as Telegraf<Context>;
    return new BotCommandsService(bot);
  }

  it('registers the command menu on init', async () => {
    const setMyCommands = jest.fn().mockResolvedValue(true);
    await make(setMyCommands).onModuleInit();

    expect(setMyCommands).toHaveBeenCalledTimes(1);
    const commands = setMyCommands.mock.calls[0][0] as Array<{
      command: string;
    }>;
    const names = commands.map((c) => c.command);
    expect(names).toEqual(expect.arrayContaining(['start', 'help', 'call']));
  });

  it('does not throw when setMyCommands fails', async () => {
    const setMyCommands = jest.fn().mockRejectedValue(new Error('network'));
    await expect(make(setMyCommands).onModuleInit()).resolves.toBeUndefined();
  });
});
