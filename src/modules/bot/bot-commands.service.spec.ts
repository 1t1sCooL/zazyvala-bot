import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { Context } from './context.interface';
import {
  BotCommandsService,
  DEFAULT_COMMANDS,
  parseBotCommands,
} from './bot-commands.service';

describe('parseBotCommands', () => {
  it('parses cmd:description pairs separated by ; or newline', () => {
    const out = parseBotCommands('start:Привет; help:Команды\ncall:Зов');
    expect(out).toEqual([
      { command: 'start', description: 'Привет' },
      { command: 'help', description: 'Команды' },
      { command: 'call', description: 'Зов' },
    ]);
  });

  it('keeps colons inside the description', () => {
    const out = parseBotCommands('call:Позвать: всех');
    expect(out).toEqual([{ command: 'call', description: 'Позвать: всех' }]);
  });

  it('skips invalid commands and empty parts', () => {
    const out = parseBotCommands('BAD CMD:x; ok:fine; nodesc; :y;');
    expect(out).toEqual([{ command: 'ok', description: 'fine' }]);
  });

  it('lowercases command names', () => {
    expect(parseBotCommands('Start:hi')).toEqual([
      { command: 'start', description: 'hi' },
    ]);
  });
});

describe('BotCommandsService', () => {
  function make(setMyCommands: jest.Mock, botCommands?: string) {
    const bot = { telegram: { setMyCommands } } as unknown as Telegraf<Context>;
    const config = {
      get: jest.fn().mockReturnValue(botCommands),
    } as unknown as ConfigService;
    return new BotCommandsService(bot, config);
  }

  it('uses default commands when BOT_COMMANDS is not set', async () => {
    const setMyCommands = jest.fn().mockResolvedValue(true);
    await make(setMyCommands).onModuleInit();
    expect(setMyCommands).toHaveBeenCalledWith(DEFAULT_COMMANDS);
  });

  it('uses commands from env when provided', async () => {
    const setMyCommands = jest.fn().mockResolvedValue(true);
    await make(setMyCommands, 'call:Зов;help:Помощь').onModuleInit();
    expect(setMyCommands).toHaveBeenCalledWith([
      { command: 'call', description: 'Зов' },
      { command: 'help', description: 'Помощь' },
    ]);
  });

  it('falls back to defaults when env parses to nothing', async () => {
    const setMyCommands = jest.fn().mockResolvedValue(true);
    await make(setMyCommands, '   ;;; ').onModuleInit();
    expect(setMyCommands).toHaveBeenCalledWith(DEFAULT_COMMANDS);
  });

  it('does not throw when setMyCommands fails', async () => {
    const setMyCommands = jest.fn().mockRejectedValue(new Error('network'));
    await expect(make(setMyCommands).onModuleInit()).resolves.toBeUndefined();
  });
});
