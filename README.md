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
| `/helpers` | Список помощников чата |
| `/addhelper`, `/delhelper` | Назначить/снять помощника (ответом на сообщение; только админ) |
| `/callpolicy [all\|assistants\|admins]` | Кто может звать (без аргумента — показать текущую; меняет админ) |

### Права на зов и анти-спам

- Политика чата `callPolicy` определяет, кто может звать:
  - `all` (по умолчанию) — все участники;
  - `assistants` — администраторы и помощники;
  - `admins` — только администраторы.
- Меняется командой `/callpolicy <policy>` (только администратор чата).
- **Анти-спам:** между зовами действует кулдаун (`ChatSettings.cooldownSec`, по умолчанию 60 сек) — повторный `/call` в это время вернёт «попробуйте через N сек».

### Помощники (assistants)

- Помощник — пользователь, которому делегируется право зова (enforcement прав появится в следующей вехе).
- Управлять помощниками может только **администратор чата**: ответьте на сообщение нужного пользователя командой `/addhelper` (или `/delhelper`).
- Лимит — **2 помощника на чат** (как в референсе; настраивается константой `MAX_ASSISTANTS_PER_CHAT`).

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

## CI / CD

- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) — на каждый push/PR в `main`: `lint:ci`, `build`, unit и e2e тесты. Статус — во вкладке **Actions** репозитория.
- **CD** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) — на push в `main`: сборка Docker-образа, пуш в `ghcr.io/1t1scool/zazyvala-bot` (теги `latest` и `:<sha>`), деплой в Kubernetes.

## Деплой в Kubernetes

Манифесты — в [`k8s/`](k8s/). Образ собирается из [`Dockerfile`](Dockerfile) (multi-stage; при старте выполняется `prisma migrate deploy`).

**Что нужно один раз настроить:**

1. **GitHub → Settings → Secrets → Actions:**
   - `KUBE_CONFIG` — ваш kubeconfig в base64 (`base64 -w0 ~/.kube/config`).
   - (GHCR использует встроенный `GITHUB_TOKEN` — отдельный секрет не нужен.)
2. **В кластере — секрет с токеном и БД:**
   ```bash
   kubectl create secret generic zazyvala-bot-secret \
     --from-literal=BOT_TOKEN='<токен от BotFather>' \
     --from-literal=DATABASE_URL='postgresql://user:pass@postgres:5432/zazyvala?schema=public'
   ```
   (шаблон — [`k8s/secret.example.yaml`](k8s/secret.example.yaml))
3. **Pull-секрет для приватного образа GHCR** (`ghcr-secret`):
   ```bash
   kubectl create secret docker-registry ghcr-secret \
     --docker-server=ghcr.io --docker-username=<github-user> --docker-password=<PAT>
   ```
4. **(опционально) PostgreSQL в кластере** — [`k8s/postgres.yaml`](k8s/postgres.yaml) (добавьте ключ `POSTGRES_PASSWORD` в секрет). Если есть managed-БД — просто укажите её в `DATABASE_URL`.

Дальнейшие деплои — автоматически на каждый push в `main`. Ручной деплой:
```bash
sed "s|IMAGE_TAG|$(git rev-parse HEAD)|g" k8s/deployment.yaml | kubectl apply -f -
```

> Деплой работает в режиме **polling** (1 реплика, strategy `Recreate` — обязательно, иначе два инстанса конфликтуют на getUpdates). Для webhook-режима понадобится Ingress + публичный домен и `BOT_MODE=webhook`.

## Структура

См. карту проекта в [`AGENTS.md`](AGENTS.md).

## Лицензия

UNLICENSED (частный проект).
