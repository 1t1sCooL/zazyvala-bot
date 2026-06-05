# AGENTS.md

> Карта проекта для AI-агентов и новых разработчиков. Обновляйте при значимых изменениях структуры. Подробности по стеку — в `.ai-factory/DESCRIPTION.md`, по архитектуре — в `.ai-factory/ARCHITECTURE.md`.

## Обзор проекта

Telegram-бот «Зазывала» на NestJS: по команде тегает (созывает) всех участников группового чата с произвольным сообщением. Помощники, кастомные группы тегов, настройки на чат, веб-админка.

## Технологический стек

- **Язык программирования:** TypeScript (Node.js)
- **Фреймворк:** NestJS
- **Telegram:** nestjs-telegraf (Telegraf v4)
- **База данных:** PostgreSQL
- **ORM:** Prisma

## Структура проекта

```
zazyvala-bot/
├── src/
│   ├── main.ts                 # Bootstrap: логи по LOG_LEVEL, shutdown hooks, listen(PORT)
│   ├── app.module.ts           # Composition root: AppConfig + Health + Bot
│   ├── modules/
│   │   ├── bot/                # Presentation-слой Telegram (nestjs-telegraf)
│   │   │   ├── bot.module.ts    # TelegrafModule.forRootAsync + APP_FILTER
│   │   │   ├── bot.update.ts    # @Update: /start, /help
│   │   │   ├── membership.update.ts  # new/left members, активность, /join /leave
│   │   │   ├── summon.update.ts       # @Command('call')
│   │   │   └── context.interface.ts
│   │   ├── chats/             # ChatsService.ensureChat (+ index.ts публичный API)
│   │   ├── members/          # MembersService: реестр участников, opt-in/opt-out
│   │   ├── settings/         # SettingsService: ChatSettings + кулдаун
│   │   ├── summon/           # SummonService + mention-builder (ЯДРО зова)
│   │   └── health/            # HTTP healthcheck
│   │       ├── health.module.ts
│   │       └── health.controller.ts   # GET /health
│   ├── prisma/               # Доступ к данным: PrismaModule + PrismaService (@Global)
│   └── shared/
│       ├── config/            # ConfigModule + валидация env + уровни логов
│       ├── filters/           # TelegrafExceptionFilter
│       └── utils/             # sendWithRetry (заготовка под 429/flood)
├── test/                     # E2E-тесты (health.e2e-spec.ts) + jest-e2e.json
├── prisma/                    # schema.prisma, migrations/, seed.ts
├── Dockerfile                 # multi-stage образ (prisma migrate deploy + node dist/main)
├── k8s/                       # deployment.yaml, secret.example.yaml, postgres.yaml
├── .github/workflows/         # ci.yml (lint/build/test) + deploy.yml (ghcr + kubectl)
├── .ai-factory/              # Контекст для AI: описание, архитектура, роадмап, правила, планы
│   ├── DESCRIPTION.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   ├── config.yaml
│   ├── plans/                 # Планы фич (/aif-plan)
│   └── rules/base.md
├── .claude/skills/           # Установленные и сгенерированные скиллы агента
└── .mcp.json                 # Конфигурация MCP-серверов (postgres, github, ...)
```

Планируемые доменные модули в `src/modules/` (см. ARCHITECTURE.md): `chats`, `members`, `summon`, `assistants`, `settings`, `admin`, плюс `prisma` (PrismaService).

## Ключевые точки входа

| Файл | Назначение |
|------|------------|
| `src/main.ts` | Bootstrap NestJS-приложения |
| `src/app.module.ts` | Корневой модуль, подключение модулей |
| `src/modules/bot/bot.module.ts` | Подключение Telegram-бота (polling/webhook) |
| `src/shared/config/env.validation.ts` | Схема и валидация переменных окружения |
| `prisma/schema.prisma` | (план) Схема БД: чаты, участники, помощники, настройки |
| `.env` | Секреты: `BOT_TOKEN`, режим бота, `PORT`, `LOG_LEVEL` (`.env.example` — шаблон) |

## Документация

| Документ | Путь | Описание |
|----------|------|----------|
| README | README.md | (план) Лендинг проекта |
| Описание | .ai-factory/DESCRIPTION.md | Стек, возможности, требования |
| Архитектура | .ai-factory/ARCHITECTURE.md | Паттерн, границы модулей, правила зависимостей |
| Роадмап | .ai-factory/ROADMAP.md | Вехи проекта |

## Файлы AI-контекста

| Файл | Назначение |
|------|------------|
| AGENTS.md | Структурная карта проекта (этот файл) |
| .ai-factory/DESCRIPTION.md | Спецификация и стек |
| .ai-factory/ARCHITECTURE.md | Архитектурные правила |
| .ai-factory/rules/base.md | Конвенции кода |

## Правила для агентов

- Telegram-хендлеры (`*.update.ts`) держать тонкими; бизнес-логику выносить в сервисы.
- Секреты только из окружения через `ConfigService`, не хардкодить в коде.
- Массовые упоминания всегда батчить под лимиты Telegram и соблюдать `retry_after` при 429.
- Разбивать составные shell-команды на отдельные шаги:
  - Неверно: `git checkout main && git pull`
  - Верно: сначала `git checkout main`, затем `git pull origin main`
