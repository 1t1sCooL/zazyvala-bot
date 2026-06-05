# План: Кастомные группы тегов

**Slug:** tag-groups
**Дата создания:** 2026-06-05
**Режим:** full

## Settings
- **Testing:** yes — unit-тесты TagGroupsService + callGroup
- **Logging:** verbose
- **Docs:** yes — README про группы тегов

## Roadmap Linkage
- **Milestone:** "Кастомные группы тегов"
- **Rationale:** Именованные подгруппы (команды/роли) и зов выборки — `/call dev` созывает только группу «dev».

## Контекст
Модели TagGroup/TagGroupMember уже есть. TagGroupsService — доступ через PrismaService, имена нормализуются (lowercase/trim). SummonService переиспользует общий батчинг для зова группы. Хендлеры тонкие.

## Tasks
- [x] **#29 TagGroupsModule + TagGroupsService + тесты** — create/remove/list/findByName/addMember/removeMember/listMembersWithUsers (имена нормализованы); импорт MembersModule (ensureUser). Unit-тесты с моками.
- [x] **#30 SummonService.callGroup + рефактор общего ядра + тесты** — выделить summonTargets (кулдаун+батчи+touch); callAll использует реестр, callGroup — членов группы; статусы ok/empty/cooldown/no_group. SummonModule импортирует TagGroupsModule. Тесты. *(blockedBy: #29)*
- [x] **#31 Команды групп + роутинг /call <group> + README** — /groups, /newgroup, /delgroup (админ), /joingroup, /leavegroup; в /call: если первый токен — имя существующей группы, звать её (остаток — текст); wiring; README + roadmap. *(blockedBy: #30)*

## Порядок
#29 → #30 → #31
