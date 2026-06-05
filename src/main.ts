import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotMode, LogLevel } from './shared/config/env.validation';
import { resolveLogLevels } from './shared/config/log-levels';

// Prisma возвращает BigInt для id; JSON.stringify по умолчанию на них падает.
// Сериализуем BigInt как строку во всех JSON-ответах (админка).
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  // Буферизуем логи до тех пор, пока не прочитаем LOG_LEVEL из конфигурации.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const logLevel = config.get<LogLevel>('LOG_LEVEL', LogLevel.Debug);
  app.useLogger(resolveLogLevels(logLevel));

  const logger = new Logger('Bootstrap');

  // Валидация DTO (админка): отбрасывает лишние поля, преобразует типы.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Корректное завершение: останавливает бота и закрывает ресурсы по SIGINT/SIGTERM.
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);
  const botMode = config.get<BotMode>('BOT_MODE', BotMode.Polling);

  await app.listen(port);

  logger.log(`Application started on port ${port}`);
  logger.debug(`Bot mode: ${botMode}`);
}

void bootstrap();
