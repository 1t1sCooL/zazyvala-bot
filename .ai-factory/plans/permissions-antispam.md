# План: Права и анти-спам

**Slug:** permissions-antispam
**Дата создания:** 2026-06-05
**Режим:** full

## Settings
- **Testing:** yes — unit-тесты canSummon + SettingsService
- **Logging:** verbose
- **Docs:** yes — README про политику зова

## Roadmap Linkage
- **Milestone:** "Права и анти-спам"
- **Rationale:** Кто может звать (все / помощники / админы) + кулдаун (уже есть). Использует isAssistant из вехи помощников.

## Контекст
Политика зова хранится в ChatSettings.callPolicy (all|assistants|admins, default all). Проверка прав — в хендлере /call (isAdmin через Telegram, isAssistant через сервис) + чистая функция canSummon. Кулдаун уже реализован в SummonService.

## Tasks
- [x] **#27 callPolicy: схема + SettingsService.setCallPolicy + canSummon() + тесты** — поле ChatSettings.callPolicy (default "all"), регенерация client+миграции; setCallPolicy(chatId, policy); чистая функция canSummon(policy, {isAdmin,isAssistant}) + unit-тесты.
- [x] **#28 Enforcement в /call + /callpolicy + README** — в SummonUpdate проверять права (isAdmin+isAssistant+canSummon) перед зовом; команда /callpolicy <all|assistants|admins> (только админ); README + roadmap. *(blockedBy: #27)*

## Порядок
#27 → #28
