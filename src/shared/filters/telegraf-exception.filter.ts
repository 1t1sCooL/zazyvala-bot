import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { TelegrafArgumentsHost } from 'nestjs-telegraf';
import { Context } from '../../modules/bot/context.interface';
import { MetricsService } from '../../modules/metrics';

/**
 * Глобальный фильтр ошибок Telegram-хендлеров.
 * Логирует ошибку и НЕ пробрасывает её дальше, чтобы сбой одного апдейта
 * не ронял polling-цикл бота.
 */
@Catch()
export class TelegrafExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TelegrafExceptionFilter.name);

  constructor(private readonly metrics: MetricsService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    // Обрабатываем только telegram-контекст; HTTP-исключения идут своим путём.
    if (host.getType<string>() !== 'telegraf') {
      throw exception;
    }

    const telegrafHost = TelegrafArgumentsHost.create(host);
    const ctx = telegrafHost.getContext<Context>();
    const message =
      exception instanceof Error ? exception.message : String(exception);

    this.metrics.incTelegramError();
    this.logger.error(
      `Telegram handler error (chat ${ctx?.chat?.id}, update ${ctx?.updateType}): ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Не пробрасываем дальше — бот продолжает работать.
  }
}
