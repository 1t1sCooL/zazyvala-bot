import { BotMode, LogLevel, validateEnv } from './env.validation';

const BASE = {
  BOT_TOKEN: '123:abc',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
};

describe('validateEnv', () => {
  it('accepts a valid minimal config and applies defaults', () => {
    const env = validateEnv({ ...BASE });

    expect(env.BOT_TOKEN).toBe('123:abc');
    expect(env.BOT_MODE).toBe(BotMode.Polling);
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe(LogLevel.Debug);
  });

  it('coerces PORT from string to number', () => {
    const env = validateEnv({ ...BASE, PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });

  it('throws when BOT_TOKEN is missing', () => {
    expect(() => validateEnv({ DATABASE_URL: BASE.DATABASE_URL })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({ BOT_TOKEN: BASE.BOT_TOKEN })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('throws when webhook mode has no BOT_WEBHOOK_DOMAIN', () => {
    expect(() => validateEnv({ ...BASE, BOT_MODE: 'webhook' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('accepts webhook mode with a domain', () => {
    const env = validateEnv({
      ...BASE,
      BOT_MODE: 'webhook',
      BOT_WEBHOOK_DOMAIN: 'https://bot.example.com',
    });
    expect(env.BOT_MODE).toBe(BotMode.Webhook);
    expect(env.BOT_WEBHOOK_DOMAIN).toBe('https://bot.example.com');
  });

  it('throws on invalid PORT', () => {
    expect(() => validateEnv({ ...BASE, PORT: 'not-a-number' })).toThrow(
      /Invalid environment configuration/,
    );
  });
});
