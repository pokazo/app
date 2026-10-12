# Design: ThemePicker CSS previews

> Дата: 2026-10-12 · статус: approved · бренд: Pokazo

## Проблема

Карточки выбора темы показывают emoji + название + описание + точки цветов. Пользователь не видит, как будет выглядеть слайд в выбранной теме, пока не сгенерирует деку.

## Цель

В `ThemePicker` заменить emoji на CSS-миниатюру 16:9 с характером темы. Оставить название, описание и точки цветов. Layout карточки: превью сверху → title → hint → dots.

## Решение

### Layout карточки (вариант A)

```
┌─────────────────────┐
│   [16:9 CSS thumb]  │
│                     │
│ Title               │
│ Hint                │
│ ● ● ●               │
└─────────────────────┘
```

Selected-state без изменений (фиолетовая обводка / soft background).

### Источник миниатюр

Только CSS/DOM-макеты. Без PNG-ассетов и без живого рендера Slidev.

У каждой темы свой характер превью (не один шаблон с заменой цветов):

| theme id     | характер превью                                      |
|--------------|------------------------------------------------------|
| auto         | градиент (фиолетовый→розовый→синий), светлый текст   |
| default      | светлый фон, teal accent bar, clean sans             |
| seriph       | cream + Georgia/serif, «газетная» линия              |
| apple-basic  | белый, центрированный минимальный title              |
| bricks       | cream + три цветных блока (coral/yellow/teal)        |
| shibainu     | тёплый paper, terracotta bar                         |
| ink-dark     | ink фон, красный accent bar                          |
| brand-auto   | ink + красный «лого»-квадрат, brand kicker           |

### Данные и компоненты

1. Убрать `emoji` из `DeckTheme` / `DECK_THEMES`.
2. Добавить `preview: ThemePreviewId` (или эквивалентный дискриминант) на каждую тему.
3. Новый компонент `ThemeThumb` (`apps/web/src/components/ThemeThumb.tsx`): по `preview` + `colors` рисует мини-слайд; декоративный (`aria-hidden`).
4. `ThemePicker` рендерит `<ThemeThumb … />` вместо `.theme-emoji`.
5. Стили: `.theme-thumb` (aspect-ratio 16/9, radius, overflow) + модификаторы `.theme-thumb--{preview}` в `apps/web/src/styles/global.css` (как остальные `.theme-card*`).

Текст внутри миниатюры — короткий illustrative copy на языке UI (RU), не обязательно совпадающий с `title`/`hint` один в один; цель — узнаваемость темы.

### Вне scope

- Реальные скриншоты Slidev / golden PNG для пикера
- Анимация переключения тем
- Изменение списка тем или их id
- Изменение API theme payload

### Тесты

- Обновить `decks.test.ts` (нет `emoji`, есть `preview` для каждой темы).
- Лёгкий smoke: `ThemeThumb` / `ThemePicker` рендерит без падения (если в web уже есть component tests; иначе достаточно unit на данные).

### Acceptance

1. В пикере нет emoji.
2. У всех 8 тем видна 16:9 миниатюра со своим характером.
3. Title, hint, color dots на месте.
4. Selected-state работает как раньше.
5. Нет новых image-ассетов и сетевых запросов для превью.
