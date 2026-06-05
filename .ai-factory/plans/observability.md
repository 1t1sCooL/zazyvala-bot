# План: Наблюдаемость и надёжность

**Slug:** observability
**Дата создания:** 2026-06-05
**Режим:** full

## Settings
- **Testing:** yes — unit-тесты health/metrics
- **Logging:** verbose
- **Docs:** yes — README

## Roadmap Linkage
- **Milestone:** "Наблюдаемость и надёжность"

## Контекст
graceful shutdown (enableShutdownHooks + Prisma onModuleDestroy + Telegraf) и
ретраи (sendWithRetry, 429) уже реализованы. Добавляем readiness-healthcheck с
проверкой БД и Prometheus-метрики.

## Tasks
- [x] **#37 Readiness healthcheck БД + k8s probes + тесты** — GET /health/ready (prisma SELECT 1 -> 200/503), /health остаётся liveness; обновить probes в k8s/deployment.yaml; unit-тесты HealthController; поправить e2e.
- [x] **#38 Prometheus /metrics + счётчики + доки** — prom-client, MetricsModule (@Global), default-метрики + zazyvala_summons_total (инкремент в SummonService) + zazyvala_telegram_errors_total (инкремент в TelegrafExceptionFilter); GET /metrics; README/AGENTS/roadmap. *(blockedBy: #37)*

## Порядок
#37 → #38
