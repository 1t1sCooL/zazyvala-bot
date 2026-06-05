# План: Каркас проекта и подключение бота

**Slug:** bootstrap-and-bot-connection
**Дата создания:** 2026-06-05
**Режим:** full (git отключён — ветка не создаётся, план slug-scoped)

## Settings

- **Testing:** yes — unit (валидация env) + e2e (/health)
- **Logging:** verbose — детальные DEBUG-логи на этапе разработки
- **Docs:** yes — обязательный docs-checkpoint при завершении (через /aif-docs)

## Roadmap Linkage

- **Milestone:** "Каркас проекта и подключение бота"
- **Rationale:** Это первая веха роадмапа; задача формирует фундамент (NestJS + ConfigModule + nestjs-telegraf + /start + healthcheck), на котором строятся все последующие вехи.

## Контекст архитектуры

Модульный монолит (см. `.ai-factory/ARCHITECTURE.md`). Telegram-хендлеры — тонкий presentation-слой; бизнес-логики на этом этапе ещё нет. Секреты только из окружения через ConfigService. Структура: `src/modules/*`, `src/shared/*`.

## Tasks

### Фаза 1 — Скелет и конфигурация
- [x] **#1 Инициализировать NestJS-проект и тулинг** — package.json, tsconfig, nest-cli, main.ts, app.module.ts, ESLint/Prettier.
- [x] **#2 Настроить ConfigModule и валидацию env** — глобальный ConfigModule, схема env (BOT_TOKEN, BOT_MODE, PORT, LOG_LEVEL), .env.example. *(blockedBy: —)*

### Фаза 2 — Подключение бота
- [x] **#3 Подключить TelegrafModule (polling/webhook) и типизированный Context** — forRootAsync, переключение режима, context.interface.ts. *(blockedBy: #1, #2)*
- [x] **#4 Реализовать BotUpdate с /start и /help** — тонкий @Update с приветствием и справкой. *(blockedBy: #3)*

### Фаза 3 — Эксплуатационный каркас
- [x] **#5 Добавить healthcheck-эндпоинт** — GET /health → 200 {status:'ok'}. *(blockedBy: #1)*
- [x] **#6 Глобальный фильтр ошибок Telegraf и graceful shutdown** — TelegrafExceptionFilter, enableShutdownHooks, заготовка под 429/flood. *(blockedBy: #1, #3)*

### Фаза 4 — Тесты
- [x] **#7 Тесты: валидация env (unit) и /health (e2e)** — зелёные npm test / test:e2e. *(blockedBy: #2, #5)*

## Commit Plan

> Git отключён в config.yaml — коммиты автоматически не создаются. Группировка приведена как логические чекпоинты, если git будет включён позже.

1. **chore: bootstrap NestJS project + tooling** — задачи #1, #2
2. **feat(bot): connect Telegram bot with /start and /help** — задачи #3, #4
3. **feat: healthcheck, error filter, graceful shutdown** — задачи #5, #6
4. **test: env validation and health e2e** — задача #7

## Порядок выполнения

#1 → #2 → (#3 → #4) ∥ (#5) → #6 → #7

Параллелизуемо: #5 (health) можно делать сразу после #1, не дожидаясь бота.
