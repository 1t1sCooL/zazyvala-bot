import { CommandRegistry } from './command-registry';
import { Context } from './context.interface';

type Next = () => Promise<unknown>;

/**
 * Пропускает только разрешённые команды. Если команда не входит в белый список
 * (BOT_COMMANDS), апдейт дальше не идёт — хендлер команды не выполняется.
 * Не-команды и обычные сообщения проходят без ограничений.
 */
export function createCommandGateMiddleware(
  registry: CommandRegistry,
): (ctx: Context, next: Next) => Promise<unknown> {
  return async (ctx: Context, next: Next) => {
    const text = (ctx.message as { text?: string } | undefined)?.text;
    if (text && text.startsWith('/')) {
      const match = text.match(/^\/([A-Za-z0-9_]+)/);
      const command = match?.[1]?.toLowerCase();
      if (command && !registry.isEnabled(command)) {
        return; // команда отключена — не пропускаем дальше
      }
    }
    return next();
  };
}
