# Spike: long-lived Slidev (dev) pool

## Goal

Owner structure ops (move/delete/insert) skip `slidev build` (~5–7s) when a live Vite process serves `/p/:id/` — write `slides.md` + HMR / remount instead.

## Enable

```bash
SLIDEV_DEV_POOL=true
SLIDEV_DEV_POOL_MAX=2          # ~600MB RSS each; 8GB shared VPS → max 2
SLIDEV_DEV_POOL_IDLE_MS=600000 # 10 min
```

## Flow

1. Owner opens ready deck → `POST /api/decks/:id/live` → pool starts `slidev slides.md --base /p/:id/`.
2. Owner `/p/:id/*` (cookie session) → HTTP(+WS) proxy to `127.0.0.1:port`.
3. Guests / no session → static `dist/` (unchanged share links).
4. Structure job: if `isSlidevDevLive(id)` → skip `buildSlidev`, mark `.live-dirty`, remap thumbs when possible.
5. Idle sweep kills sessions; dirty dist may lag share until next full build (TODO: rebuild on evict).

## Limits

- Same process as API worker (sticky to one slot).
- Nginx `location /p/` must pass `Upgrade` (see `deploy/api/host.conf`).
- Insert thumbs skipped while live (no Playwright against stale dist).

## Verify

1. Deploy API + web; set on API host `.env`: `SLIDEV_DEV_POOL=true`, `SLIDEV_DEV_POOL_MAX=2`.
2. Reload nginx with `deploy/api/host.conf` (`location /p/` + Upgrade).
3. Open owner view → logs `[slidev-dev] ready` / `[edit] live_preview_ready`.
4. Move slide → `[structure] skip build (live HMR)` and `structure_ok` ≪ 2s (was ~5s).
5. Incognito share link still loads static dist (no session → no proxy).

## Caveats

- Pool lives in the API Node process (same as BullMQ worker). Splitting workers later needs sticky routing or Redis-coordinated ports.
- Share/export can lag while `.live-dirty` until next full build (evict rebuild TODO).
- RAM: plan for ≤2 sessions on the shared 8GB VPS.
