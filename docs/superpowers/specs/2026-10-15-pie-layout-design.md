# Pie layout design

**Date:** 2026-10-15  
**Status:** approved (pie-only; SVG, no chart libs)

## Goal

Slide layout matching the reference: title + description on the left; titled pie chart with % labels and legend on the right. LLM picks via `layout-get("pie")` with character caps.

## Decisions

- **Chart type:** pie only (not bar/donut family).
- **Rendering:** pure SVG arcs in `pie.vue` — no Chart.js/D3 (deck copy stays dependency-free; PDF/PPTX safe).
- **Title accent:** single H1 color (no partial-word highlight in v1).
- **Data:** frontmatter `items: [{label, value}]` with 3–5 slices; `value` is share weight (normalized to 100% for drawing). Optional `chartTitle`. Body = H1 + description paragraph.

## Contract (fields[].limit)

| Field | Limit |
|-------|--------|
| H1 | ≤42 chars |
| description | ≤90 chars |
| chartTitle | ≤48 chars |
| items | 3–5 |
| items[].label | ≤16 chars |
| items[].value | positive number |
| kicker | ≤28 chars |

## Compose / outline

- `visual=pie`
- Map `outline.stats` or dedicated `cards`-like list — prefer `stats`-shaped `{value,label}` remapped OR new outline field. **v1:** use `cards` is wrong; use outline `stats` with value as number string + label, OR add `pie: [{label,value}]`. Prefer **`stats` reuse** is confusing. Add outline field `pie: [{label, value}]` max 5.

## Layout chrome

- Left column: kicker, H1, description.
- Right: soft card (existing pk-card pattern) with chartTitle, SVG pie, horizontal legend.
- Slice colors: `--pk-slice-1..5` CSS vars per `palette` (theme-driven; no hardcoded JS colors).

## Tests

- Assert + markdown gate + catalog entry + golden screenshot in `__screenshots__/layouts/pie.png`.
