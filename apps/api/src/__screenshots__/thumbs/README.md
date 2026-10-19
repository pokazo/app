# Filmstrip thumb screenshot goldens

Visual contract for `/thumbs/v2/N.webp` filmstrip (full slide raster) and blank placeholder UI.

Legacy `/thumbs/N.webp` remains readable for old decks but new builds write only v2.

Filmstrip cells never render heading text — image shot or empty 16:9 frame.

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
| `filmstrip-blank.png` | Blank frames before shots exist |
| `ui-slide-shot-strip.png` | Markup-only slide-shot strip |
| `ui-blank-strip.png` | Markup-only blank placeholders |
