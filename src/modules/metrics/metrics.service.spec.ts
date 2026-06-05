import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('exposes counters and default metrics', async () => {
    const m = new MetricsService();
    m.incSummons();
    m.incSummons();
    m.incTelegramError();

    const out = await m.metrics();
    expect(out).toContain('zazyvala_summons_total 2');
    expect(out).toContain('zazyvala_telegram_errors_total 1');
    // дефолтные метрики Node присутствуют
    expect(out).toContain('process_cpu_user_seconds_total');
    expect(m.contentType).toContain('text/plain');
  });
});
