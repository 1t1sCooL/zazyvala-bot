# План: Веб-админка

**Slug:** web-admin
**Дата создания:** 2026-06-05
**Режим:** full

## Settings
- **Testing:** yes — unit-тесты AdminService + guard
- **Logging:** verbose
- **Docs:** yes — README + k8s Ingress

## Roadmap Linkage
- **Milestone:** "Веб-админка"

## Контекст
Админка — REST API на том же NestJS-сервере (порт 3000), защищённый токеном
(ADMIN_TOKEN). Эндпоинты под /admin. BigInt сериализуется в строку глобально.
Плюс минимальная HTML-панель. UI-SPA — опционально позже.

## Tasks
- [x] **#34 Auth + AdminModule + статистика/список чатов** — ADMIN_TOKEN (env), AdminAuthGuard, AdminModule/Controller, AdminService.getStats + GET /admin/stats, GET /admin/chats (со счётчиками); поле ChatSettings.summonsTotal + инкремент в SummonService; BigInt->string в main.ts; тесты.
- [x] **#35 Детали чата + участники + запись** — GET /admin/chats/:id, GET /admin/chats/:id/members, PATCH /admin/chats/:id/settings, помощники (GET/POST/DELETE); тесты. *(blockedBy: #34)*
- [x] **#36 HTML-панель + README + Ingress** — простая статичная страница дашборда (fetch к /admin с токеном), README раздел «Админка», пример k8s Ingress. *(blockedBy: #35)*

## Порядок
#34 → #35 → #36
