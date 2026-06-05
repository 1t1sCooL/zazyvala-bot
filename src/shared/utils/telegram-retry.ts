export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface TelegramError {
  response?: {
    error_code?: number;
    parameters?: { retry_after?: number };
  };
}

/**
 * Выполняет отправку с ретраями при flood control (429).
 * Telegram возвращает 429 с parameters.retry_after (секунды) — мы его уважаем.
 *
 * Заготовка под массовый зов (следующая веха): здесь будет жить устойчивая
 * отправка батчей упоминаний. Сейчас — базовый хелпер, готовый к использованию.
 */
export async function sendWithRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  for (let n = 0; ; n++) {
    try {
      return await fn();
    } catch (err) {
      const e = err as TelegramError;
      const is429 = e.response?.error_code === 429;
      const retryAfter = e.response?.parameters?.retry_after;
      if (is429 && n < attempts) {
        await sleep((retryAfter ?? 1) * 1000 + 250);
        continue;
      }
      throw err;
    }
  }
}
