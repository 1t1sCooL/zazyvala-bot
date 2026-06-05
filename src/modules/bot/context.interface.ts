import { Context as TelegrafContext } from 'telegraf';

/**
 * Типизированный контекст бота. Заготовка под session/scene,
 * которые появятся в следующих вехах (настройки, кастомные группы тегов).
 * Сейчас — алиас базового контекста Telegraf; будет расширен пересечением типов.
 */
export type Context = TelegrafContext;
