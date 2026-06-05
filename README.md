# Зазывала — Telegram-бот созыва участников

Telegram-бот на **NestJS**, который по команде тегает (созывает) всех участников группового чата одним сообщением. Подробное описание — в [`.ai-factory/DESCRIPTION.md`](.ai-factory/DESCRIPTION.md), архитектура — в [`.ai-factory/ARCHITECTURE.md`](.ai-factory/ARCHITECTURE.md), план развития — в [`.ai-factory/ROADMAP.md`](.ai-factory/ROADMAP.md).

> Статус: реализован каркас (подключение бота, `/start`, `/help`, healthcheck). Логика зова — в следующих вехах.

## Стек

- TypeScript + NestJS
- [nestjs-telegraf](https://github.com/bukhalo/nestjs-telegraf) (Telegraf v4)
- PostgreSQL + Prisma (планируется в следующей вехе)

## Требования

- Node.js 20+ (разрабатывалось на 24)
- Токен бота от [@BotFather](https://t.me/BotFather)

## Установка

```bash
npm install
cp .env.example .env   # затем впишите реальный BOT_TOKEN
```

## Конфигурация (`.env`)

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `BOT_TOKEN` | Токен бота от @BotFather (обязательно) | — |
| `BOT_MODE` | `polling` (dev) или `webhook` (prod) | `polling` |
| `BOT_WEBHOOK_DOMAIN` | Домен вебхука (обязателен при `BOT_MODE=webhook`) | — |
| `PORT` | Порт HTTP-сервера (healthcheck) | `3000` |
| `LOG_LEVEL` | `error` \| `warn` \| `log` \| `debug` \| `verbose` | `debug` |

Невалидный `.env` приводит к падению на старте с понятной ошибкой (валидация через `class-validator`).

## Запуск

```bash
npm run start:dev    # режим разработки (watch)
npm run build && npm run start:prod   # продакшн
```

Проверка работоспособности:

```bash
curl http://localhost:3000/health
# {"status":"ok","uptime":...,"timestamp":"..."}
```

В Telegram: напишите боту `/start` или `/help`.

## Команды и регистрация участников

| Команда | Действие |
|---------|----------|
| `/start`, `/help` | Приветствие и справка |
| `/call [текст]` | Позвать всех подписанных участников (с необязательным текстом) |
| `/join` | Подписаться на зов в этом чате |
| `/leave` | Отписаться от зова |

### Как работает зов (`/call`)

- Созывает всех **активных подписанных** участников чата (`/join` по умолчанию включён).
- Упоминания отправляются **пачками** (по умолчанию 5 на сообщение) через `text_mention` — работает даже для пользователей без username.
- Между зовами действует **кулдаун** (по умолчанию 60 сек) — настраивается на чат (`ChatSettings.cooldownSec`).
- Текст после `/call` прикрепляется к зову; без него используется `header` из настроек чата.
- Сбой отправки отдельной пачки не отменяет весь зов (частичный успех), 429/flood обрабатываются с backoff.

Бот ведёт собственный реестр участников (в Telegram нет нативного `@all`):

- при добавлении участников (`new_chat_members`) они регистрируются автоматически;
- при выходе (`left_chat_member`) помечаются как покинувшие;
- **авто-регистрация по активности** — любой написавший в группе попадает в реестр (так подхватываются те, кто был в чате до бота);
- подписка включена по умолчанию; ею управляют `/join` и `/leave`.

## База данных

PostgreSQL + [Prisma](https://www.prisma.io/). Схема — в [`prisma/schema.prisma`](prisma/schema.prisma) (модели `Chat`, `User`, `ChatMember`, `ChatSettings`, `Assistant`, `TagGroup`, `TagGroupMember`).

```bash
# 1. Укажите DATABASE_URL в .env
# 2. Сгенерируйте клиент
npm run db:generate
# 3. Примените миграции
npm run db:migrate:dev      # локальная разработка (создаёт/применяет миграции)
npm run db:migrate          # прод: prisma migrate deploy (применяет готовые миграции)
# 4. (опционально) демо-данные
npm run db:seed
```

Доступ к БД изолирован за `PrismaService` (модуль `src/prisma/`) — доменные сервисы внедряют его, а не `PrismaClient` напрямую.

## Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run start:dev` | Запуск с авто-перезагрузкой |
| `npm run build` | Сборка в `dist/` |
| `npm run lint` | ESLint + Prettier (с авто-фиксом) |
| `npm test` | Unit-тесты (Jest) |
| `npm run test:e2e` | E2E-тесты |
| `npm run db:generate` | Генерация Prisma Client |
| `npm run db:migrate` | Применение миграций (прод) |
| `npm run db:seed` | Сидинг демо-данных |

## Структура

См. карту проекта в [`AGENTS.md`](AGENTS.md).

## Лицензия

UNLICENSED (частный проект).
