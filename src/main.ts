import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotMode, LogLevel } from './shared/config/env.validation';
import { resolveLogLevels } from './shared/config/log-levels';

async function bootstrap(): Promise<void> {
  // Буферизуем логи до тех пор, пока не прочитаем LOG_LEVEL из конфигурации.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const logLevel = config.get<LogLevel>('LOG_LEVEL', LogLevel.Debug);
  app.useLogger(resolveLogLevels(logLevel));

  const logger = new Logger('Bootstrap');

  // Корректное завершение: останавливает бота и закрывает ресурсы по SIGINT/SIGTERM.
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);
  const botMode = config.get<BotMode>('BOT_MODE', BotMode.Polling);

  await app.listen(port);

  logger.log(`Application started on port ${port}`);
  logger.debug(`Bot mode: ${botMode}`);
}

void bootstrap();
