import { ConfigService } from '@nestjs/config';
import {
  CommandRegistry,
  DEFAULT_COMMANDS,
  parseBotCommands,
} from './command-registry';

function registry(botCommands?: string): CommandRegistry {
  const config = {
    get: jest.fn().mockReturnValue(botCommands),
  } as unknown as ConfigService;
  return new CommandRegistry(config);
}

describe('parseBotCommands', () => {
  it('parses cmd:description pairs separated by ; or newline', () => {
    expect(parseBotCommands('start:Привет; help:Команды\ncall:Зов')).toEqual([
      { command: 'start', description: 'Привет' },
      { command: 'help', description: 'Команды' },
      { command: 'call', description: 'Зов' },
    ]);
  });

  it('keeps colons inside the description', () => {
    expect(parseBotCommands('call:Позвать: всех')).toEqual([
      { command: 'call', description: 'Позвать: всех' },
    ]);
  });

  it('skips invalid commands and empty parts', () => {
    expect(parseBotCommands('BAD CMD:x; ok:fine; nodesc; :y;')).toEqual([
      { command: 'ok', description: 'fine' },
    ]);
  });
});

describe('CommandRegistry', () => {
  it('without env: full default list, everything enabled', () => {
    const r = registry(undefined);
    expect(r.configured).toBe(false);
    expect(r.list()).toBe(DEFAULT_COMMANDS);
    expect(r.isEnabled('call')).toBe(true);
    expect(r.isEnabled('whatever')).toBe(true);
  });

  it('with env: whitelist only (plus start/help always on)', () => {
    const r = registry('call:Зов;groups:Группы');
    expect(r.configured).toBe(true);
    expect(r.list()).toEqual([
      { command: 'call', description: 'Зов' },
      { command: 'groups', description: 'Группы' },
    ]);
    expect(r.isEnabled('call')).toBe(true);
    expect(r.isEnabled('groups')).toBe(true);
    expect(r.isEnabled('settings')).toBe(false); // не в списке
    expect(r.isEnabled('start')).toBe(true); // always-on
    expect(r.isEnabled('help')).toBe(true); // always-on
  });

  it('helpText is built from the effective list', () => {
    const r = registry('call:Зов');
    expect(r.helpText()).toBe('/call — Зов');
  });
});
