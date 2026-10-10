# Design: Layout MCP for outline selection

> Дата: 2026-10-10 · статус: approved · бренд: Pokazo

## Проблема

Outline-агент выбирает `visual` почти вслепую: в промпте есть имена layout’ов и форма payload, но нет каталога «когда брать / что рисует / какие поля». Compose знает больше (`composeSkill`), но уже после выбора.

## Цель

1. Stdio MCP-сервер layout-каталога (как Slidev MCP).
2. Outline ходит в tools (`list` / `get` / `match`) и только потом фиксирует outline JSON.
3. Один source-of-truth каталог; goldens/vision в v1 не входят.

## Решение

### Каталог

`apps/api/src/layout-catalog.ts` — записи на каждый compose-layout:

- `id` (совпадает с `visual` / `layout:`)
- `summary`, `whenToUse`, `antiPatterns`
- `outlineFields` — что ждать в outline JSON
- `frontmatter` / `body` — что уходит в Slidev
- `displays` — что пользователь видит на слайде
- `example` — минимальный пример payload

### MCP tools

| tool | input | output |
|------|-------|--------|
| `layout-list` | optional `tag` | краткие карточки всех layout’ов |
| `layout-get` | `id` | полная запись каталога |
| `layout-match` | `intent`, optional `hasNumbers`, `hasSteps`, `wantsPhoto`, `featureCount` | ranked `id[]` + короткие reasons |

Сервер: `apps/api/src/layout-mcp-server.ts`, запуск `tsx`/compiled node, stdio, `@modelcontextprotocol/sdk`.

Клиент: `withLayoutMcp` по образцу `withSlidevMcp` (`experimental_createMCPClient` + stdio transport).

### Outline pipeline

1. `withLayoutMcp` → tools `layout-*`.
2. `generateText` (outline model) с system/prompt: перед выбором visual вызови list/get/match; затем вызови локальный tool `submit_outline` с полным JSON по схеме `Outline`.
3. `submit_outline` парсит через `Outline.parse` + `validateOutlinePlan`; при ошибках возвращает issues (модель может revise в том же `maxSteps` цикле).
4. Если после maxSteps нет валидного submit — fallback: существующий `generateObject` + `refineOutlineUntilValid` (без tools), чтобы generate не падал.

Compose в v1 может получить read-only те же MCP tools (опционально); минимум — outline.

### Вне scope v1

- Vision / чтение golden PNG
- Автозамена visual без модели
- Публичный npm-пакет MCP

## Тесты

- Unit: catalog completeness vs `LAYOUT_SHOT_ORDER` (минус hero-only edge cases as needed)
- Unit: `layout-match` ranking sanity
- Unit: MCP tool handlers (list/get/match) без spawn
- Integration (optional): spawn server, list tools via client
