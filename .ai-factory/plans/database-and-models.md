# План: База данных и модели

**Slug:** database-and-models
**Дата создания:** 2026-06-05
**Режим:** full (git отключён — slug-scoped)

## Settings

- **Testing:** yes — лёгкий smoke-тест PrismaService + `prisma validate`
- **Logging:** verbose — DEBUG-логи подключения/отключения БД
- **Docs:** yes — обновить README (раздел БД)

## Roadmap Linkage

- **Milestone:** "База данных и модели"
- **Rationale:** Вторая веха роадмапа; даёт слой персистентности (PostgreSQL + Prisma), на котором строятся реестр участников, помощники, настройки и зов.

## Контекст архитектуры

Модульный монолит (см. `.ai-factory/ARCHITECTURE.md`). Доступ к данным изолируется через `PrismaService` (global-модуль `prisma`); доменные сервисы не работают с SQL напрямую. Telegram-идентификаторы — `BigInt`.

## Tasks

### Фаза 1 — Подключение Prisma
- [x] **#8 Установить Prisma и настроить datasource + DATABASE_URL** — deps prisma/@prisma/client, prisma/schema.prisma (datasource+generator), DATABASE_URL в env-валидацию и .env.example.
- [x] **#9 Описать схему данных (schema.prisma)** — модели Chat, User, ChatMember, ChatSettings, Assistant, TagGroup, TagGroupMember. *(blockedBy: #8)*

### Фаза 2 — Интеграция в приложение
- [x] **#10 PrismaModule + PrismaService** — global-модуль, lifecycle (onModuleInit connect, enableShutdownHooks), подключение в AppModule. *(blockedBy: #9)*
- [x] **#11 Сгенерировать Prisma Client и начальную миграцию** — `prisma generate`; начальный SQL миграции (`prisma migrate diff`/`migrate dev`). *(blockedBy: #9)*

### Фаза 3 — Сидинг и проверка
- [x] **#12 Seed-скрипт и тесты** — prisma/seed.ts, npm-скрипт db:seed; smoke-тест PrismaService + проверка `prisma validate`; обновить README. *(blockedBy: #10, #11)*

## Commit Plan

> Git отключён — логические чекпоинты:
1. **chore(db): add Prisma datasource + DATABASE_URL** — #8
2. **feat(db): data model schema** — #9, #11
3. **feat(db): PrismaService module + seed + tests** — #10, #12

## Порядок выполнения

#8 → #9 → (#10 ∥ #11) → #12
