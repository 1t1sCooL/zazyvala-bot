# План: Зов всех (ядро)

**Slug:** summon-core
**Дата создания:** 2026-06-05
**Режим:** full (git отключён — slug-scoped)

## Settings

- **Testing:** yes — unit-тесты mention-builder и SummonService (моки)
- **Logging:** verbose — DEBUG-логи зова (chat, кол-во, батчи)
- **Docs:** yes — README про /call

## Roadmap Linkage

- **Milestone:** "Зов всех (ядро)"
- **Rationale:** Центральная фича продукта; после неё бот — рабочий MVP.

## Контекст архитектуры

Модульный монолит. `SummonService` использует `MembersService.listActiveSubscribed` и `SettingsService` (через публичные API), батчит упоминания под лимиты Telegram и отправляет через переданный `Telegram`-клиент. Хендлер `/call` тонкий.

## Tasks

### Фаза 1 — Настройки и схема
- [x] **#17 SettingsModule/Service + поле lastSummonAt** — добавить `lastSummonAt DateTime?` в ChatSettings, регенерировать client + init-миграцию; SettingsService.getForChat (ensure + defaults), touchLastSummon. index.ts.

### Фаза 2 — Логика упоминаний
- [x] **#18 Mention-builder + батчинг (util) + тесты** — чистые функции: buildMentionMessage (text_mention, UTF-16 offsets), chunk по mentionsPerBatch; unit-тесты. *(blockedBy: —)*

### Фаза 3 — Сервис зова
- [x] **#19 SummonModule + SummonService + тесты** — callAll(chatId, telegram, customText?): кулдаун, список участников, батчи через sendWithRetry, touchLastSummon; unit-тесты с моками. *(blockedBy: #17, #18)*

### Фаза 4 — Хендлер и доки
- [x] **#20 /call handler + wiring + README** — SummonUpdate (@Command('call')), парсинг текста, ответы на кулдаун/пустой список; подключить SummonModule в BotModule; README. *(blockedBy: #19)*

## Commit Plan

> Git отключён — логические чекпоинты:
1. **feat(settings): settings service + lastSummonAt** — #17
2. **feat(summon): mention batching + summon service** — #18, #19
3. **feat(bot): /call command + docs** — #20

## Порядок выполнения

(#17 ∥ #18) → #19 → #20
