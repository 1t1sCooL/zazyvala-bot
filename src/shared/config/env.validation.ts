import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum BotMode {
  Polling = 'polling',
  Webhook = 'webhook',
}

export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Log = 'log',
  Debug = 'debug',
  Verbose = 'verbose',
}

/**
 * Схема переменных окружения. Валидируется один раз при старте приложения —
 * при невалидных значениях процесс падает с понятной ошибкой.
 */
export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  BOT_TOKEN!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsEnum(BotMode)
  BOT_MODE: BotMode = BotMode.Polling;

  // Домен вебхука обязателен только в режиме webhook.
  @ValidateIf((env: EnvironmentVariables) => env.BOT_MODE === BotMode.Webhook)
  @IsString()
  @IsNotEmpty()
  BOT_WEBHOOK_DOMAIN?: string;

  @Type_Number()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.Debug;
}

/**
 * Приводит строковые env к числу для валидации @IsInt.
 */
function Type_Number(): PropertyDecorator {
  return Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  );
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return validated;
}
