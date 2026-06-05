import { LogLevel as NestLogLevel } from '@nestjs/common';
import { LogLevel } from './env.validation';

// Уровни от самого важного к самому подробному.
const ORDER: NestLogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

/**
 * Возвращает список уровней логов NestJS, включаемых при заданном LOG_LEVEL.
 * Например, LOG_LEVEL=debug включает error, warn, log, debug (без verbose).
 */
export function resolveLogLevels(level: LogLevel): NestLogLevel[] {
  const index = ORDER.indexOf(level as unknown as NestLogLevel);
  return index === -1 ? ORDER : ORDER.slice(0, index + 1);
}
