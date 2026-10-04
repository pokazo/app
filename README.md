# Pokazo app

Монорепо: `apps/web` (лендинг) и `apps/api` (Hono, auth, генерация Slidev).

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm --filter @pokazo/api migrate
pnpm dev
```

Прод: GitHub Actions → GHCR → `91.207.75.72` (web) и `80.87.196.33` (api). См. `docs/deploy.md`.
