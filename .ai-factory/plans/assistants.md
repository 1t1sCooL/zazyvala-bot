# План: Помощники (assistants)

**Slug:** assistants
**Дата создания:** 2026-06-05
**Режим:** full

## Settings
- **Testing:** yes — unit-тесты AssistantsService (моки)
- **Logging:** verbose — DEBUG на add/remove
- **Docs:** yes — README про помощников

## Roadmap Linkage
- **Milestone:** "Помощники (assistants)"
- **Rationale:** Со-ведущие с правом зова; основа для вехи прав/анти-спама (enforcement в следующей вехе).

## Контекст архитектуры
Модульный монолит. AssistantsService — доступ к данным через PrismaService. Управление помощниками доступно только админам чата (проверка через Telegram getChatMember). Хендлеры тонкие.

## Tasks
- [x] **#25 AssistantsModule + AssistantsService + тесты** — add (лимит на чат + проверка дубликата), remove, list/listWithUsers, isAssistant, count. index.ts. Unit-тесты с моками.
- [x] **#26 Команды /addhelper /delhelper /helpers + admin-check + README** — AssistantsUpdate: только в группе, только админ чата может добавлять/удалять (по reply на сообщение пользователя); /helpers — список; admin-check helper; подключить модуль; README. *(blockedBy: #25)*

## Порядок
#25 → #26
