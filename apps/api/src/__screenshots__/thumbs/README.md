# Filmstrip thumb screenshot goldens

Visual contract for `/thumbs/N.webp` filmstrip (full slide raster) and cover-fallback UI.

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
| `thumb-page-1.png` / `thumb-page-2.png` | Decoded WebP of each slide shot |
| `filmstrip-slide-shots.png` | Column of slide shots (no heading overlay) |
| `thumb-size-compare.png` | 1280 capture vs 400 WebP side-by-side |
| `filmstrip-cover-fallback.png` | Photo+label / heading-only before shots exist |
| `ui-*.png` | Markup-only UI strips (no Slidev build) |
