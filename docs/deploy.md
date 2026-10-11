# Деплой Pokazo (CI, два Docker, без простоя)

> Проверено: 2026-10-04 · источники: DNS-панель (A `@` и `www` → `91.207.75.72`), архитектура Hono + Vite, правило «только GitHub Actions, не scp руками»

## Вердикт

Два сервера, два пайплайна, **только push в `master`/`main` → GitHub Actions**. Ручной `docker compose` на VPS и rsync/scp **не** рабочий путь.

| Что | Куда | DNS |
|-----|------|-----|
| Лендинг + `/login` + `/app` (статика Vite) | **91.207.75.72** | `pokazo.ru`, `www.pokazo.ru` уже A → этот IP |
| API + воркер + Redis/Postgres рядом | **80.87.196.33** | завести `api.pokazo.ru` A → этот IP |

**С чего начать:** GitHub Environments `landing` / `api`, SSH-ключи, GHCR, скрипт blue-green на обоих хостах.

## Что деплоить с коммита в master

Один workflow на `push` в `main` (в GitHub у `pokazo/doc` сейчас `main`; когда появится код-репо — то же). Джобы с `paths`, чтобы не гонять оба сервера зря.

| Изменения в коммите | Джоба | Артефакт | Хост |
|---------------------|-------|----------|------|
| `apps/web/**`, `apps/web/Dockerfile`, `deploy/landing/**` | `deploy-landing` | `ghcr.io/pokazo/web:<sha>` | 91.207.75.72 |
| `apps/api/**`, `apps/api/Dockerfile`, `deploy/api/**` | `deploy-api` | `ghcr.io/pokazo/api:<sha>` | 80.87.196.33 |
| `.github/workflows/deploy.yml`, `deploy/common/**` | **оба** | оба образа | оба |
| Только `docs/**` | **ничего** | — | — |
| `apps/web` + `apps/api` в одном коммите | оба, **параллельно** | два образа | два IP |

До кода в репо: этот документ. Первый рабочий CI — когда появятся `apps/*`.

Порядок джобы:

1. `test` (web + api, что затронуто)
2. `docker build` + `push` в GHCR, тег `git sha` + `latest`
3. `deploy-*` по SSH: pull образа, поднять **idle**-слот, health, переключить nginx, остановить старый слот

Падение health → **не** переключать nginx, старый контейнер продолжает принимать трафик.

## Blue-green: два Docker

На каждом хосте всегда два слота приложения + один nginx на 80/443.

```text
nginx :443
    └── proxy_pass http://127.0.0.1:{ACTIVE_PORT}

slot-a  контейнер  :18080   (или :18081)
slot-b  контейнер  :18081
```

Имена: `pokazo-web-a` / `pokazo-web-b` на лендинге; `pokazo-api-a` / `pokazo-api-b` на бэке.

Файл состояния `/etc/pokazo/active-slot` = `a` | `b`.

Скрипт `deploy/switch.sh` (одинаковый смысл на обоих серверах):

1. `IDLE=$(a если active=b, иначе b)`
2. `docker pull`; заменить **только idle**-контейнер (live не трогать)
3. Ждать health на idle-порту: лендинг `GET /` 200; API `GET /api/health`
4. Nginx `upstream`: новый primary + старый `backup`, `nginx -t` && `reload` (не restart)
5. Проверка **через :443** (`Host` pokazo.ru / api.pokazo.ru). Провал → откат upstream на старый слот, idle стоп, exit 1
6. Upstream только новый, reload, ещё раз :443
7. `active-slot=$IDLE`, 20s drain, `docker stop` бывший active (без rm)

Два контейнера сосуществуют, пока новый не отвечает снаружи. Nginx не останавливается.

Лендинг: образ nginx со статикой из `vite build`. Слоты **19080 / 19081** (localhost). Снаружи один nginx+certbot на 443.

API: два контейнера Hono; Redis/Postgres — **отдельные**, не в blue-green (данные общие). Session cookie и BullMQ смотрят в один Postgres/Redis.

Volumes API-слота (`deploy/switch.sh`):

| Хост | Контейнер | Назначение |
|------|-----------|------------|
| `/var/lib/pokazo/decks` | `/app/data/decks` | `DECK_DATA_DIR` — колоды |
| `/var/lib/pokazo/uploads` | `/app/data/uploads` | `UPLOAD_DATA_DIR` — оригиналы user-upload для upload-images MCP / triage |

Перед первым деплоем с uploads: `mkdir -p /var/lib/pokazo/uploads` на API-хосте. Post-deploy smoke: создать колоду с 3–6 картинками через UI и проверить `assets.json` на `source: "upload"` (см. [upload-images design](./superpowers/specs/2026-10-11-upload-images-mcp-design.md)).

## Сеть между серверами

Браузер на `pokazo.ru` зовёт `https://api.pokazo.ru`. CORS: origin `https://pokazo.ru` и `https://www.pokazo.ru`. Cookie: `Domain=.pokazo.ru` если сессия с API на поддомене; иначе Better Auth на `api.` + SameSite=None Secure **или** прокси `/api` с лендинга на бэк (предпочтительно **не** проксировать генерацию через 91.x — тяжёлый воркер на 80.x).

TLS: certbot на каждом nginx. Пока нет `api.pokazo.ru` — не открывать API в интернет без TLS.

Firewall 80.87.196.33: 22, 80, 443. Порты 18080/18081 только localhost. То же на 91.207.75.72.

## CI (GitHub Actions)

Репозиторий с кодом (не только `pokazo/doc`): workflow `.github/workflows/deploy.yml`.

Secrets:

| Secret | Где |
|--------|-----|
| `GHCR` | `GITHUB_TOKEN` хватает для `packages: write` |
| `LANDING_SSH_KEY`, `LANDING_HOST=91.207.75.72` | env `landing` |
| `API_SSH_KEY`, `API_HOST=80.87.196.33` | env `api` |
| на серверах `.env` (OpenRouter, Yandex OAuth, `DATABASE_URL`) | **не** в git; compose `env_file` |

Правила:

- Триггер: `push` branches `main` / `master`.
- `concurrency: deploy-${{ job }}` чтобы два пуша не сломали слоты.
- Тесты красные → образа нет → деплоя нет.
- Нет SSH с ноутбука в проде как штатный путь.

## Хосты: что крутится

**91.207.75.72 (лендинг)**  
nginx:443, два контейнера `web-a/b`, certbot. Без Node, без ключа LLM.

**80.87.196.33 (бэк)**  
nginx:443 → api slots; контейнеры `api-a/b`; `postgres`, `redis` (один инстанс); позже Docker job для `slidev build`. Диск для `dist/` колод.

## План внедрения (порядок)

1. DNS: `api.pokazo.ru` → `80.87.196.33` (лендинг уже на `91.207.75.72`).
2. На обоих VPS: docker, nginx, пользователь `deploy`, ключ только из Actions.
3. Репо с `apps/web`, `apps/api`, Dockerfiles, `deploy/switch.sh`.
4. Workflow: test → build → ssh switch.
5. Прогон: dummy `/api/health` и пустой лендинг «Показо», два подряд деплоя без 502.
6. Auth и генерация — после зелёного CI, не вместо него.

## Не брать / оговорки

- Не деплоить `pokazo/doc` как сайт: там markdown, не Vite.
- Не один docker-compose `restart` на месте — это простой.
- Не общий сервер «всё на 91.x»: воркер Slidev и API живут на 80.x.
- Не `--no-verify` / деплой с ветки feature.

## История правок

| Дата | Что изменили |
|------|----------------|
| 2026-10-04 | Разнесение IP, CI на master, blue-green два контейнера, карта paths |
| 2026-10-04 | switch.sh: backup-слот + health через :443 до стопа старого |
