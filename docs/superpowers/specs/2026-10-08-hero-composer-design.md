# Design: Hero Composer

> Дата: 2026-10-08 · статус: approved · бренд: Pokazo

## Проблема

Первый слайд (cover/hero) собирается тем же compose-агентом, что и остальные. Получается однообразный split text|photo и hero не выделяется.

## Цель

Отдельная LLM-фаза **hero-compose** после outline: сама выбирает тип hero и собирает только слайд 1. Остальные слайды — прежний compose, без правок hero.

## Типы (variant)

Без `split` и без `interactive`:

| variant | композиция |
|---------|------------|
| `centered` | текст по центру; фото фоном с затемнением |
| `fullbleed` | фото на весь кадр; текст поверх |
| `editorial` | асимметричная editorial-вёрстка, крупная типографика |
| `product` | крупный визуал продукта/сцены + короткий promise |

Frontmatter: `layout: hero` + `variant: <id>` + `image:` + `kicker` / `brand` по желанию.

## Пайплайн

```text
research → outline → scaffold → hero-compose (slide 1)
  → compose rest (не трогает slide 1) → build/repair → speech
```

## Не в скоупе

- BullMQ-очередь отдельно от `decks`
- Interactive hero
- Split 50/50 layout
