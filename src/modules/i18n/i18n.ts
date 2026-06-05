import { messages } from './messages';

export const LANGS = ['ru', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const DEFAULT_LANG: Lang = 'ru';

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export function asLang(value: string | null | undefined): Lang {
  return value && isLang(value) ? value : DEFAULT_LANG;
}

/**
 * Возвращает локализованную строку по ключу с подстановкой {vars}.
 * Fallback: язык → ru, отсутствующий ключ → сам ключ.
 */
export function t(
  lang: string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = messages[asLang(lang)] ?? messages[DEFAULT_LANG];
  const template = dict[key] ?? messages[DEFAULT_LANG][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
