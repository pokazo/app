# Filmstrip thumb screenshot goldens

Visual contract for `/thumbs/v2/N.webp` filmstrip (full slide raster) and heading-only placeholder UI.

Legacy `/thumbs/N.webp` remains readable for old decks but new builds write only v2.

## Regenerate

```bash
cd apps/api
UPDATE_THUMB_SHOTS=1 RUN_THUMB_E2E=1 pnpm exec vitest run src/deck-thumbs.test.ts src/deck-thumb-shots.test.ts
```

## Check without writing

```bash
RUN_THUMB_E2E=1 pnpm exec vitest run src/deck-thumbs.test.ts src/deck-thumb-shots.test.ts
```

## Goldens

| File | Meaning |
|------|---------|
| `thumb-page-1.png` / `thumb-page-2.png` | Decoded WebP of each slide shot (from v2) |
| `filmstrip-slide-shots.png` | Column of slide shots (no heading overlay) |
| `thumb-size-compare.png` | 1280 capture vs 400 WebP side-by-side |
| `filmstrip-heading-only.png` | Heading placeholders before shots exist |
| `ui-slide-shot-strip.png` | Markup-only slide-shot strip |
| `ui-heading-only-strip.png` | Markup-only heading placeholders |
