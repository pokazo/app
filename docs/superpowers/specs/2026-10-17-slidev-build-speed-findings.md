# Findings: speeding one Slidev build (2026-10-17)

## Split (prod fixture `55de091e…`, active API slot)

| Step | ms |
|------|---:|
| `slidev build` | **6364** |
| Playwright layout gate | **5201** |
| Filmstrip thumbs | **6313** |
| **buildAndGate total** | **17879** |

`hero→preview` / `final_build` in `timings.json` (~13–18 s p50) = build + gate + thumbs, not Vite alone.

## Pure `slidev build` floor

Already optimized in-repo: `minify: false`, `cssMinify: false`, `reportCompressedSize: false`, per-deck `.vite-cache`.

Prod cold/warm bench (same fixture, 3× each):

| Mode | avg ms |
|------|-------:|
| per-deck cold | 5911 |
| per-deck warm | 5807 |
| shared cache first | 5563 |
| shared warm | 6039 |

**Shared Vite cache ≈ no win** (noise band). Warm cache does not make Slidev production builds incremental — matches [slidev#1465](https://github.com/slidevjs/slidev/issues/1465) (antfu: no incremental build).

Lean headmatter (`monaco: false`, `twoslash: false`, `remoteAssets: false`, `record: false`, `drawings.enabled: false`) vs baseline: **5478 vs 5634 ms** (~3%). Ship for hygiene; do not expect UX-visible speedup.

## Decisions

1. **Do not** make shared `SLIDEV_VITE_CACHE` the default. Env hook remains for experiments only.
2. **Ship** `build.sourcemap: false` + lean headmatter pin in `md-guard`.
3. **Preview TTFB &lt; 1 s** is **out of scope for vite tuning**. Floor for one `slidev build` is ~5.5–6.5 s. Options for a later design:
   - long-lived `slidev` (dev) process per deck + reverse proxy;
   - skip gate on preview; defer/coalesce thumbs;
   - fewer progressive rebuilds during compose.
4. **Next product lever** (same wall-clock, not “faster Vite”): gate only on final, thumbs async / incremental — can cut perceived “build” phase by ~half without touching Slidev.

## Code

- [`apps/api/src/slidev.ts`](../../apps/api/src/slidev.ts) — `sourcemap: false`, `SLIDEV_VITE_CACHE` optional
- [`apps/api/src/md-guard.ts`](../../apps/api/src/md-guard.ts) — `pinLeanSlidevHeadmatter`
