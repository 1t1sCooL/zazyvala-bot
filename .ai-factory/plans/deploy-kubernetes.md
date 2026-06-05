# План: Деплой в Kubernetes

**Slug:** deploy-kubernetes
**Дата создания:** 2026-06-05
**Режим:** full

## Settings
- **Testing:** n/a (инфраструктура; проверка — сборка образа в CI)
- **Logging:** n/a
- **Docs:** yes — README раздел «Деплой»

## Roadmap Linkage
- **Milestone:** "Деплой в Kubernetes"
- **Rationale:** Пользователь деплоит на свой сервер в k8s; формат повторяет существующий паттерн (osint_bot): ghcr.io образ, секреты, kubectl apply через KUBE_CONFIG.

## Tasks
- [x] **#21 Dockerfile (multi-stage Node) + .dockerignore** — builder (npm ci + prisma generate + build) → runner (prod-deps, миграции при старте, node dist/main).
- [x] **#22 k8s манифесты** — k8s/deployment.yaml (1 реплика, Recreate, /health probes, secret/env, ghcr-secret), k8s/secret.example.yaml, опционально k8s/postgres.yaml. *(blockedBy: #21)*
- [x] **#23 CD workflow** — .github/workflows/deploy.yml: build & push в ghcr.io/1t1scool/zazyvala-bot, deploy через KUBE_CONFIG + sed IMAGE_TAG + kubectl apply + rollout status. *(blockedBy: #22)*
- [x] **#24 README «Деплой» + roadmap** — инструкция (secrets GHCR/KUBE_CONFIG/zazyvala-bot-secret), отметить веху. *(blockedBy: #23)*

## Порядок
#21 → #22 → #23 → #24
