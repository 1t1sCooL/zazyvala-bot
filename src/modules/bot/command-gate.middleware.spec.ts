import { ConfigService } from '@nestjs/config';
import { createCommandGateMiddleware } from './command-gate.middleware';
import { CommandRegistry } from './command-registry';

function gateWith(botCommands?: string) {
  const config = {
    get: jest.fn().mockReturnValue(botCommands),
  } as unknown as ConfigService;
  return createCommandGateMiddleware(new CommandRegistry(config));
}

function ctxText(text: string) {
  return { message: { text } } as never;
}

describe('createCommandGateMiddleware', () => {
  it('blocks a command not in the whitelist', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    await gateWith('call:Зов')(ctxText('/groups'), next);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a whitelisted command (with @botname and args)', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    await gateWith('call:Зов')(ctxText('/call@bot всех'), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('always allows /start and /help', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    await gateWith('call:Зов')(ctxText('/help'), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes non-command messages through', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    await gateWith('call:Зов')(ctxText('просто сообщение'), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows everything when no whitelist configured', async () => {
    const next = jest.fn().mockResolvedValue(undefined);
    await gateWith(undefined)(ctxText('/settings'), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
