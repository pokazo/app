# Design: Layout assert + screenshot goldens

> Дата: 2026-10-09 · статус: approved · бренд: Pokazo

## Проблема

Кастомные Slidev layout’ы молча рисуют пустые/битые слайды при плохом frontmatter. Compose не узнаёт об ошибке, пока человек не откроет плеер. Нет визуальных регрессионных тестов на 11 layout’ов.

## Цель

1. Layout при данных, которые нельзя показать, **бросает** `LayoutError[<name>]: …` в Vue setup/render.
2. Compose **реагирует**: post-build render gate ловит ошибку → существующий MCP repair с текстом `LayoutError`.
3. Happy-path каждого layout’а покрыт Playwright golden PNG (аналог Paparazzi).

## Решение

### Контракт ошибок

Общий модуль `apps/api/slidev-layouts/layout-assert.js` (копируется в deck `layouts/` вместе с `.vue`; plain JS — Slidev не должен компилировать TS в layouts):

- `layoutError(name, message)` → `Error` с префиксом `LayoutError[name]:`
- `assert*` на props (и slots где возможно)

Правила (минимум):

| layout | fail when |
|--------|-----------|
| stats / cards | &lt;2 валидных items (value+label / title) |
| skills | &lt;2 items с name |
| timeline | &lt;3 steps с title |
| icon | пустой iconHint |
| image-left / image-right | нет локального `image` (не http) |
| hero | variant не из centered\|fullbleed\|editorial\|product; fullbleed/product без image |
| quote / fact / two-cols | нет default slot (quote/fact) или нет left+right (two-cols) |

### Compose реакция

1. **Pre-build (быстро):** `buildSlidev` вызывает `assertLayoutsInMarkdown` — те же правила, парсинг frontmatter. Compose/repair видит `LayoutError` сразу, без ожидания Vite.
2. **Vue throw** при render — страховка в плеере.
3. **Post-build Playwright** `assertDeckLayoutsRender` — ловит pageerror; в CI/локально: `RUN_LAYOUT_E2E=1`.

При падении — тот же repair-путь в `generate.ts`. В `compose-skill` / repair prompt: при `LayoutError[…]` починить frontmatter/body **этого** layout.

Screenshot goldens (build outside Documents — iCloud can hang Slidev):

```bash
# one-time deps in /tmp
mkdir -p /tmp/pokazo-layout-shots/nm && cd /tmp/pokazo-layout-shots/nm \
  && npm init -y && npm i @slidev/cli@52.20.1 @slidev/theme-default@0.25.0 playwright-chromium@1.63.0

cd apps/api && pnpm update-layout-shots
```

Or vitest: `RUN_LAYOUT_E2E=1 UPDATE_LAYOUT_SHOTS=1 pnpm exec vitest run src/layout-screenshots.test.ts` (needs working local Slidev).

### Screenshot tests

- Фикстурный deck: один happy-path слайд на каждый из 11 layout’ов (+ маленькое локальное JPG для photo/hero).
- `buildSlidev` → screenshot `#slide-container` → compare с `apps/api/src/__screenshots__/layouts/*.png` через pixelmatch.
- Env `UPDATE_LAYOUT_SHOTS=1` перезаписывает goldens.
- Unit-тесты `layout-assert.test.ts` на good/bad fixtures без браузера.

## Не в скоупе

- Валидация до MCP insert
- Встроенные Slidev layout’ы (default, cover, …)
- Paparazzi / Android
