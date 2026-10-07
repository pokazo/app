# Design: Спич выступающего

> Дата: 2026-10-07 · статус: approved · бренд: Pokazo

## Проблема

После генерации колоды у докладчика нет готового устного текста: ни короткой шпаргалки (тезисы), ни полного спича по слайдам. Экспорт PPTX сейчас — только картинки слайдов, без notes.

## Цель

Для каждой готовой колоды:

1. На каждый слайд — **тезисы** (шпаргалка, по строке) и **спич** (полный устный текст).
2. Текст пишет LLM в пайплайне generate; пользователь может править в модалке.
3. Спич сохраняется в **PDF**.
4. При скачивании **PPTX** колоды тезисы + спич попадают в **заметки докладчика** (speaker notes).

## Не в скоупе

- Word / `.txt` экспорт
- Заметки в веб-плеере Slidev / «пульт»
- Чат-редактор спича
- Регенерация одного слайда спича (только вся колода)

## Решение (вердикт)

Подход: **eager generation** — `speech.json` пишется в основном `generate` после compose (не lazy по клику).

```text
topic
  → OutlineAgent
  → ComposeAgent (slides.md + build)
  → SpeechAgent (structured) → speech.json
  → deck ready

DeckView «Спич»
  → GET speech → модалка → debounce PUT
  → PDF: GET export/speech-pdf
  → PPTX: ensureDeckExport(pptx) читает speech.json → notes
```

Если SpeechAgent упал — колода всё равно `ready`; модалка показывает missing + «Сгенерировать» (`POST …/speech/regenerate`).

## Контракт данных

Файл в workDir колоды: `speech.json`.

```json
{
  "slides": [
    {
      "index": 1,
      "heading": "Антон Бутов — Android/Kotlin разработчик",
      "theses": "строка тезиса\nвторая строка",
      "speech": "Полный устный текст абзацами."
    }
  ]
}
```

Zod (идея):

| Поле | Тип | Правила |
|------|-----|---------|
| `slides` | array | длина = числу слайдов outline / view-meta |
| `index` | number | 1-based, уникальный |
| `heading` | string | из outline/heading слайда |
| `theses` | string | non-empty после trim; строки через `\n` |
| `speech` | string | non-empty после trim; устный стиль |

Инвалидация кэша:

- `speech.pdf` свежий, пока mtime ≥ `speech.json`
- `export.pptx` свежий только если ≥ `slides.md` **и** (если есть) ≥ `speech.json`

## SpeechAgent

- Момент: после успешного compose (+ repair/build), до финального trace.
- Вход: `outline` + текст `slides.md` (справочно).
- Модель: `config.composeModel` (или отдельный env позже; в MVP — compose).
- Выход: `generateObject` + Zod схема выше.
- Промпт: русский устный текст; тезисы — короткие, одна мысль на строку (видно «на пульте» в будущем); спич — связная речь, не копипаст буллетов слайда; тон = аудитория колоды, если известна.
- Ошибка: лог + отсутствие файла; generate не падает.

## API

Доступ: как у экспорта колоды (владелец / auth по существующим правилам deck).

| Метод | Поведение |
|-------|-----------|
| `GET /api/decks/:id/speech` | `200` + JSON; если файла нет — `200` `{ "status": "missing" }` |
| `PUT /api/decks/:id/speech` | валидация Zod → запись `speech.json`; `200` |
| `POST /api/decks/:id/speech/regenerate` | SpeechAgent заново → `speech.json`; `200` + JSON |
| `GET /api/decks/:id/export/speech-pdf` | ensure speech PDF → attachment |

Ошибки: `400` на битый PUT; `404` на нет колоды; `404`/`409` на PDF без speech (сообщение «сначала сгенерируйте»).

## UI

- Точка входа: кнопка «Спич» в тулбаре `DeckView` (рядом с PDF/PPTX колоды).
- Модалка «Спич выступающего» (иконка микрофона):
  - шапка: **PDF** + закрытие;
  - список секций «Слайд N [heading]»;
  - блок тезисов (monospace textarea) + блок спича (обычный textarea);
  - при `missing` / ошибке generate — CTA «Сгенерировать»;
  - loading при первом открытии, если файл ещё пишется (опционально poll GET).
- Автосохранение: debounce ~500 ms → `PUT`.
- Стили: в духе существующего deck chrome / design-system, не отдельный кремовый макет ради макета.

## PDF спича

- Playwright Chromium (уже в api): HTML-шаблон A4 из `speech.json` → `page.pdf`.
- Артефакт: `speech.pdf` в workDir.
- Содержимое: заголовок колоды; на каждый слайд — heading, тезисы (список), спич.
- Имя скачивания: `${downloadBasename(topic без расширения)} — спич.pdf` (тот же sanitize, что у export колоды).

## PPTX notes

- Расширить `pptxFromPngs(pngs, title, notes?: string[])`:
  - notes slide parts + relationships;
  - текст notes = `theses` + `\n\n` + `speech` (пусто → без notes part для слайда).
- `renderDeckExport` / `ensureDeckExport` для `pptx`: подтянуть `speech.json` если есть.
- Без `speech.json` — поведение как сейчас (только PNG-слайды).

## Тесты

| Область | Что |
|---------|-----|
| unit | Zod speech schema; notes text join; cache freshness с учётом speech.json |
| unit | PPTX package содержит notesSlide при переданных notes |
| unit | HTML builder для speech PDF (строка/структура) |
| api | GET missing; PUT ok/400; regenerate с моком LLM |
| web | кнопка открывает модалку; debounce save (лёгкий) |

## Критерии готовности

1. Новая колода после generate имеет `speech.json` с тезисами и спичем на каждый слайд.
2. Модалка показывает и сохраняет правки.
3. Кнопка PDF скачивает читаемый A4 со спичем.
4. Скачанный PPTX открывается в PowerPoint/Keynote с notes на слайдах (когда speech был).
5. Падение SpeechAgent не делает колоду `failed`.

## История правок

| Дата | Что |
|------|-----|
| 2026-10-07 | Первичный design после согласования (eager generate, PDF + PPTX notes, без Word/txt/пульта) |
