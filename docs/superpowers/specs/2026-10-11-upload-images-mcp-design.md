# Design: Upload images MCP (search user files first)

Date: 2026-10-11  
Status: approved (session)

## Problem

Users often already have on-brand photos. Stock/Yandex search should not ignore those files. Need attach-at-create, durable originals on disk for triage, and an agent-facing search that runs **before** Yandex → Unsplash → generate.

## Decisions

| ID | Decision |
|----|----------|
| D1 | Optional multi-file attach on create (`jpeg`/`png`/`webp`, max 20 × 8MB) via `multipart/form-data` `POST /api/decks` |
| D2 | Storage root `UPLOAD_DATA_DIR` (default `./data/uploads`), path `{UPLOAD_DATA_DIR}/{deckId}/` — **not** under `DECK_DATA_DIR` |
| D3 | Persist originals + `manifest.json` + vision-captioned `index.json` for error analysis |
| D4 | Stdio MCP `pokazo-upload-images` (like layout MCP): `upload-image-list`, `upload-image-search` |
| D5 | In-process `upload-image-use` copies into `workDir/public/` (same split as yandex search/download) |
| D6 | Photo order: **upload → Yandex → Unsplash → image-generate** |
| D7 | Not registered in Cursor `mcp.json` — runtime worker MCP only |
| D8 | Search = keyword/token overlap on filename + vision caption (no CLIP in v1) |

## Architecture

```text
AppHome FormData
  → POST /api/decks (multipart)
  → UPLOAD_DATA_DIR/{deckId}/orig + manifest.json
  → BullMQ generate
      → ensureUploadIndex (vision captions → index.json)
      → withUploadImagesMcp (stdio)
      → hero/compose tools: upload-image-* then yandex/stock/gen
      → copy hit → DECK_DATA_DIR/{deckId}/public/slide-N.jpg
```

### Disk layout

```text
UPLOAD_DATA_DIR/{deckId}/
  manifest.json
  index.json
  up-001.jpg …
DECK_DATA_DIR/{deckId}/public/slide-N.jpg   # Slidev local image:
DECK_DATA_DIR/{deckId}/assets.json          # attributions source: "upload"
```

Prod: `/var/lib/pokazo/uploads` → `/app/data/uploads` (see `deploy/switch.sh`).

### MCP tools

| Tool | Where | Role |
|------|--------|------|
| `upload-image-list` | stdio MCP | List id / filename / caption |
| `upload-image-search` | stdio MCP | Rank by query tokens; `suggestedId` |
| `upload-image-use` | in-process | Copy to `public/`; attribution `source: "upload"` |

Env for MCP child: `UPLOAD_IMAGES_DIR` = absolute deck upload folder.

## Non-goals

- Reusable cross-deck packs / gallery UI
- ZIP / PDF / docs as sources
- CLIP embeddings / reverse image search
- Cursor IDE MCP registration
- Changing local-only Slidev `image:` rule

## Post-deploy acceptance

1. Login → `/app` → create deck with topic matching test photos + attach 3–6 images.
2. Wait for `preview`/`ready`.
3. Success: `assets.json` has ≥1 `source: "upload"`; originals exist under `UPLOAD_DATA_DIR/{deckId}/`.
4. If no upload attributions with relevant photos → pipeline bug (skill/MCP/order).

## Related

- Supersedes photo order in [2026-10-08-yandex-images-stock-design.md](./2026-10-08-yandex-images-stock-design.md) when uploads are present (Yandex remains first among remote sources).
