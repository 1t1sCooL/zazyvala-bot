# План: Регистрация участников в группе

**Slug:** member-registration
**Дата создания:** 2026-06-05
**Режим:** full (git отключён — slug-scoped)

## Settings

- **Testing:** yes — unit-тесты сервисов с замоканным PrismaService
- **Logging:** verbose — DEBUG-логи входа/выхода/подписки
- **Docs:** yes — обновить README/команды

## Roadmap Linkage

- **Milestone:** "Регистрация участников в группе"
- **Rationale:** Третья веха роадмапа; формирует реестр участников (opt-in/opt-out), без которого невозможен зов.

## Контекст архитектуры

Модульный монолит. Telegram-хендлеры (bot) — тонкие, вызывают доменные сервисы `ChatsService`/`MembersService`. Доступ к БД — только через `PrismaService`. Telegram id → `BigInt`.

## Tasks

### Фаза 1 — Доменные сервисы
- [x] **#13 ChatsModule + ChatsService** — ensureChat (upsert Chat + создание ChatSettings по умолчанию). Публичный API через index.ts.
- [x] **#14 MembersModule + MembersService** — ensureUser, registerMember (active), markLeft, setSubscribed, listActiveSubscribed. Публичный API через index.ts. *(blockedBy: —)*

### Фаза 2 — Telegram-хендлеры
- [x] **#15 Хендлеры регистрации + /join /leave** — MembershipUpdate: @On('new_chat_members'), @On('left_chat_member'), авто-регистрация по активности (@On('message')), команды /join и /leave. Подключить ChatsModule/MembersModule в BotModule. *(blockedBy: #13, #14)*

### Фаза 3 — Тесты и доки
- [x] **#16 Тесты сервисов + README** — unit-тесты ChatsService/MembersService с замоканным PrismaService; обновить README (команды /join, /leave, авто-регистрация). *(blockedBy: #13, #14)*

## Commit Plan

> Git отключён — логические чекпоинты:
1. **feat(members): chats & members domain services** — #13, #14
2. **feat(bot): membership tracking + join/leave** — #15
3. **test(members): service unit tests + docs** — #16

## Порядок выполнения

(#13 ∥ #14) → #15 → #16
