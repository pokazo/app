# Design: richer Slidev compose + stock assets MCP

> Дата: 2026-10-05 · статус: implemented (Unsplash key still needed for live photos) · бренд: Pokazo

## Проблема

Сейчас compose через MCP Slidev **работает**, но колоды однотипные: outline = `heading + ≤5 bullets`, compose обязан следовать JSON один в один, официальный Slidev skill не в промпте, картинок нет. Результат — cover + default-буллеты, не визуальные слайды уровня presentations.ai.

## Цель

Качественные, визуально разнообразные презентации по теме:

- чередование layouts (cover, image-right/left, two-cols, quote, fact, section, end…);
- стоковые фото (Unsplash) локально в колоде;
- иконки через UnoCSS packs (без отдельного MCP);
- compose = автор слайда в рамках outline-intent, не «дамп буллетов».

Не в скоупе этого design: AI-генерация картинок, произвольный Vue, внешние URL картинок в dist, второй polish-pass как отдельная кнопка UI.

## Решение (вердикт)

```text
topic
  → OutlineAgent (intent + visual hint + тезисы)
  → ComposeAgent:
       tools = Slidev MCP + Assets MCP
       system = Pokazo rules + сжатый официальный Slidev skill (layouts/syntax)
       скачивает сток в workDir/public/
       пишет слайды через insert/update
  → MdGuard (whitelist layouts, icon tags, local image paths)
  → slidev build (сеть не нужна: только локальные /public/*)
```

Иконки: пресет UnoCSS + 1–2 icon packs в `@pokazo/api`. В markdown — разрешённые icon-компоненты/classes.

Фото: тонкий **Assets MCP** (in-process или stdio) поверх Unsplash API.

## Outline (новый контракт)

Не готовый markdown. Поля слайда:

| Поле | Тип | Назначение |
|------|-----|------------|
| `heading` | string | заголовок / тезис |
| `points` | string[] (0–5) | опорные факты, не финальный copy |
| `intent` | string | зачем слайд (1 предложение) |
| `visual` | enum | `none` \| `icon` \| `image-right` \| `image-left` \| `two-cols` \| `quote` \| `fact` \| `section` \| `cover` \| `end` |
| `imageQuery` | string? | английский поисковый запрос для стока, если visual = image-* |
| `iconHint` | string? | подсказка иконки (напр. `java`, `cloud`), если visual = icon |

Deck-level: `title`, `slides[]` (clamp 6–16, как сейчас).

Правила outline-модели:

- ≥ 1 cover и ≤ 1 end;
- ≥ ~⅓ слайдов с `visual` ∈ {image-right, image-left, icon, two-cols, quote, fact};
- не все `default`/`none`.

Compose **может** уточнять layout и формулировки; **не может** менять число слайдов и игнорировать intent.

## Assets MCP

Провайдер v1: **Unsplash** (`UNSPLASH_ACCESS_KEY`). Pexels — позже, тот же интерфейс tools.

### Tools

| Tool | Args | Result |
|------|------|--------|
| `stock-search` | `query`, `orientation?` (`landscape` default), `count?` (1–5) | список `{ id, url, thumb, width, height, photographer, attributionUrl }` |
| `stock-download` | `id` **или** `url`, `filename` (safe basename) | `{ path: "/filename.jpg", attribution }` — файл в `workDir/public/` |

Поведение:

- download пишет только под `workDir/public/`; path traversal запрещён;
- в compose frontmatter: `image: /filename.jpg` (Slidev public);
- attribution копятся в `assets.json` рядом с `outline.json` / в `meta.json`;
- таймаут search/download ~15s; fail tool → compose продолжает без картинки на этом слайде (fallback layout without image).

Реализация: модуль `apps/api/src/assets-mcp.ts` — либо in-process tools в AI SDK (предпочтительно, без второго stdio), либо stdio MCP. **Предпочтение: in-process AI SDK tools** с тем же контрактом имён, чтобы не плодить процесс; интерфейс совместим с будущим отдельным MCP.

## Compose agent

System prompt:

1. Pokazo visual rules (язык, no Vue/script, whitelist layouts, local images only).
2. Сжатый фрагмент официального skill: layouts `image-right`/`image-left`/`two-cols`/`quote`/`fact`, `::right::`, иконки.
3. Порядок: для image-слайдов сначала `stock-search` → `stock-download` → `slidev-update/insert` с `layout` + `image`.
4. Insert только `after` существующего номера; после пачки — `list-slides`.
5. Цель: не простыня буллетов; один сильный тезис + визуал; цифры можно крупно в content.

Tools на compose:

- все текущие Slidev MCP (кроме goto);
- `stock-search`, `stock-download`.

maxSteps поднять пропорционально (image-слайды = +2 tool calls каждый).

Repair: как сейчас через Slidev MCP; assets tools доступны, если битый image path.

## MdGuard / build

Расширить whitelist layouts: `image-left`, `image` (optional), уже есть `image-right`.

Разрешить:

- frontmatter `image: /…` только относительный path под public (не `http://`);
- ограниченный набор icon tags / классов (allowlist prefix `carbon:`, `mdi:` или Vue-компоненты pack’а).

Запретить по-прежнему: `<script`, `.vue` custom SFC, remote image URLs.

`ensureDeckNodeModules` + public dir: `mkdir workDir/public`. После download файлы видны Slidev build.

UnoCSS icons: зависимости в `apps/api` так, чтобы `slidev build` в workDir резолвил packs через symlink `node_modules`.

## Env

| Env | Назначение |
|-----|------------|
| `UNSPLASH_ACCESS_KEY` | Unsplash API |
| существующие `LLM_*` / OpenRouter | без изменений контракта имён моделей |

Нет ключа Unsplash → compose без stock tools (или tools возвращают явную ошибку); генерация текста/layouts всё равно идёт.

## Наблюдаемость

Расширить `compose-trace.json`:

- mcp/slidev calls (как сейчас);
- stock search/download (query, id, path, ok/fail);
- счётчик слайдов с image/icon.

## Тест-план (acceptance)

1. Unit: outline Zod принимает `visual` / `imageQuery`; reject remote image в guard.
2. Unit: `stock-download` path traversal blocked; write under `public/`.
3. Integration (мок Unsplash): compose получает tools, download → файл, md содержит `layout: image-right` и `image: /…`.
4. Live demo (ключ есть): тема с визуалом → ≥2 слайда с локальными jpg, `slidev build` ok, плеер `/p/:id/`.
5. Регрессия: без Unsplash key колода всё ещё `ready` (без фото).

## Риски

| Риск | Митигация |
|------|-----------|
| Параллельные insert с неверным `after` | Промпт: строго sequential insert; после ошибок — list |
| Unsplash rate limit | count≤3, кэш query→id в job; fallback без фото |
| Тяжёлые jpg | resize optional later; v1 — оригинал с max edge через Unsplash params `w=1600` |
| Icon packs раздувают образ | 1–2 packs; не все `@iconify` |
| Compose игнорирует visual | В prompt: «если visual=image-* и нет download — это fail слайда» + trace metric |

## Неделание (explicit)

- Pexels в v1
- AI image gen
- Dev-server `__mcp` + screenshot loop
- Показ outline пользователю
- Редактор слайдов

## История

| Дата | Что |
|------|-----|
| 2026-10-05 | Draft после демо MCP + решение «сток Unsplash», не AI images |
