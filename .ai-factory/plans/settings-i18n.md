# План: Настройки чата + локализация

**Slug:** settings-i18n
**Дата создания:** 2026-06-05
**Режим:** full

## Settings
- **Testing:** yes — unit-тесты сеттеров/валидации и i18n
- **Logging:** verbose
- **Docs:** yes — README про настройки и язык

## Roadmap Linkage
- **Milestone:** "Настройки чата и локализация"

## Контекст
SettingsService уже хранит header/mentionsPerBatch/cooldownSec/language/callPolicy. Добавляем команды управления, blacklist (исключение из зова) и слой i18n (RU/EN) для ответов бота.

## Tasks
- [x] **#32 Управление настройками + blacklist + тесты** — SettingsService: setHeader/setCooldown/setMentionsPerBatch (+валидация); ChatMember.blacklisted (схема+миграция); MembersService.setBlacklisted + фильтр в listActiveSubscribed; команды /settings, /setheader, /setcooldown, /setbatch (админ), /ignore /unignore (reply, админ); тесты.
- [x] **#33 Локализация RU/EN (i18n) + /setlang + тесты** — словари RU/EN + t(lang,key,vars); SettingsService.setLanguage(+валидация); команда /setlang; перевод ключевых ответов (/start, /help, /settings, результаты /call); тесты i18n. *(blockedBy: #32)*

## Порядок
#32 → #33
