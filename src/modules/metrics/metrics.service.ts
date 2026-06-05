import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Registry } from 'prom-client';

/**
 * Реестр Prometheus-метрик: дефолтные метрики Node + доменные счётчики.
 */
@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly summons: Counter;
  private readonly telegramErrors: Counter;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.summons = new Counter({
      name: 'zazyvala_summons_total',
      help: 'Total number of successful summons',
      registers: [this.registry],
    });
    this.telegramErrors = new Counter({
      name: 'zazyvala_telegram_errors_total',
      help: 'Total number of Telegram handler errors',
      registers: [this.registry],
    });
  }

  incSummons(): void {
    this.summons.inc();
  }

  incTelegramError(): void {
    this.telegramErrors.inc();
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
