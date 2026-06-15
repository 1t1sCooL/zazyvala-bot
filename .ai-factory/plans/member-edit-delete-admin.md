# План: Редактирование и удаление участников в админке

**Тип:** enhancement (расширение веб-админки)
**Ветка:** main (создание веток отключено в config.yaml → `git.create_branches: false`)
**Дата:** 2026-06-15
**Slug:** member-edit-delete-admin

## Контекст

Недавно добавили возможность **добавлять** участников бота через админку
(`POST /admin/chats/:id/members` + кнопка «+ участник» в UI; коммиты `e3ca906`, `d5ac236`).
Теперь нужно дать админу **удалять** и **изменять** участников из того же интерфейса.

В коде уже есть всё необходимое для основы:
- Реестр участников — модель `ChatMember` (`prisma/schema.prisma`), композитный PK `[chatId, userId]`,
  флаги `subscribed` (подписан на зов), `blacklisted` (игнор), `status` (`active`/`left`).
- `MembersService` (`src/modules/members/members.service.ts`) — есть `setSubscribed`,
  `setBlacklisted`, `markLeft`, но они делают **upsert** по `EnsureUserInput` и не подходят
  для редактирования уже существующего участника по `userId`; нет жёсткого удаления участника.
- Админ-слой: `AdminController`/`AdminService`/`dto.ts` + единый inline-SSR UI в
  `admin-ui.controller.ts` (вся разметка и JS в константе `PAGE`, helper `api()`).
- Защита: `AdminAuthGuard` (заголовок `x-admin-token`) на всём `AdminController`.

## Решения по реализации

1. **Удаление = жёсткое удаление строки реестра** (`prisma.chatMember.deleteMany` по `{chatId,userId}`),
   зеркаля `AssistantsService.remove()` (`count>0 → ok`, иначе `not_found`).
   Обоснование: админ-«удалить» = полностью убрать из реестра чата. Если участник всё ещё активен
   в чате, авто-регистрация по активности может вернуть его — это ожидаемое поведение
   (ручное удаление — это коррекция, а не бан; для исключения из зова есть `blacklisted`).
2. **Редактирование = переключение флагов `subscribed` и `blacklisted`** существующего участника
   через **новый метод по `userId`** (`updateMemberFlags`), а не через upsert-методы
   `setSubscribed`/`setBlacklisted` (те требуют полного `EnsureUserInput` и создают участника).
   Поля `Имя`/`Username` берутся из Telegram (`User`) и админом не редактируются.
3. **Тонкие presentation-слои** (ARCHITECTURE.md): контроллер только делегирует, бизнес-логика —
   в доменном `MembersService`; доступ к данным — только через `PrismaService`.

## Настройки

- **Тесты:** да — проект тестирует сервисы (`admin.service.spec.ts`, `assistants.service.spec.ts`);
  новую логику покрываем, зеркаля существующий стиль (`jest`, мок Prisma/Members).
- **Логирование:** verbose. `logger.log` на удаление участника (заметное админ-действие),
  `logger.debug` на изменение флагов. Стиль — шаблонные строки с `chatId`/`userId` (как в проекте).
- **Документация:** warn-only (без обязательного docs-чекпоинта).

## Roadmap Linkage

- **Milestone:** "Веб-админка"
- **Rationale:** фича расширяет уже завершённую веху веб-админки (управление участниками
  чата), добавляя операции изменения и удаления к существующему добавлению.

## Задачи

### Фаза 1 — Доменный слой (members)

- [x] **Задача #1** — `MembersService`: `updateMemberFlags(chatId, userId, {subscribed?, blacklisted?})`
  (updateMany, только переданные поля, `ok`/`not_found`, без создания участника) и
  `removeMember(chatId, userId)` (deleteMany, зеркало `assistants.remove`).
  Файлы: `members.service.ts`, `index.ts`. Логи: `log` на удаление, `debug` на изменение флагов.

### Фаза 2 — Админ-API (admin)

- [x] **Задача #2** — `UpdateMemberDto` (`subscribed?`, `blacklisted?` — `@IsOptional()@IsBoolean()`)
  в `src/modules/admin/dto.ts`, по образцу `UpdateSettingsDto`. *(независима от #1)*
- [x] **Задача #3** — `AdminService.updateMember` / `removeMember`: обёртки над `MembersService`,
  `NotFoundException` при `not_found`, `userId` в ответе строкой (BigInt не сериализуется).
  Блокируется #1, #2.
- [x] **Задача #4** — `AdminController`: `@Patch('chats/:id/members/:userId')` и
  `@Delete('chats/:id/members/:userId')` → делегируют в `AdminService` (`BigInt(...)`).
  Проверить отсутствие конфликта со статическим маршрутом `.../members/pending/:username`.
  Блокируется #2, #3.

### Фаза 3 — UI

- [x] **Задача #5** — Admin UI (`admin-ui.controller.ts`, константа `PAGE`): в под-таблице участников
  добавить колонку «Действия» — удаление (confirm → `DELETE`) и переключатели `Подписан`/`Игнор`
  (→ `PATCH`) через helper `api()`; убедиться, что `listMembers` отдаёт `userId` для URL.
  Блокируется #4.

### Фаза 4 — Тесты

- [x] **Задача #6** — Юнит-тесты: `members.service.spec.ts` (создать) для `updateMemberFlags`/`removeMember`
  и дополнение `admin.service.spec.ts` (`NotFoundException` / success-shape). Запуск: `npm test`.
  Блокируется #1, #3.

## Commit Plan

| Чекпоинт | Задачи | Сообщение коммита |
|----------|--------|-------------------|
| 1 | #1, #2 | `feat(members): editable flags + hard remove primitives for admin` |
| 2 | #3, #4 | `feat(admin): PATCH/DELETE endpoints to edit and remove chat members` |
| 3 | #5 | `feat(admin): edit/delete member controls in admin UI` |
| 4 | #6 | `test(members,admin): cover member edit and delete` |

## Затрагиваемые файлы

- `src/modules/members/members.service.ts`, `src/modules/members/index.ts`
- `src/modules/admin/dto.ts`, `src/modules/admin/admin.service.ts`, `src/modules/admin/admin.controller.ts`
- `src/modules/admin/admin-ui.controller.ts`
- `src/modules/members/members.service.spec.ts` (новый), `src/modules/admin/admin.service.spec.ts`

## Риски / краевые случаи

- **Сериализация BigInt** `userId` в JSON-ответах — возвращать строкой.
- **Конфликт маршрутов** `members/:userId` vs `members/pending/:username` — статический сегмент
  `pending` имеет приоритет; проверить порядок объявления хендлеров.
- **Авто-регистрация** удалённого активного участника по активности — ожидаемо; для постоянного
  исключения из зова использовать `blacklisted`, а не удаление.
- **listMembers должен отдавать `userId`** — без него UI не построит URL для PATCH/DELETE.
