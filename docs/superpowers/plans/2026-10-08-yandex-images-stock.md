# Yandex Images Stock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a VPS HTTP Yandex Images search service and wire Pokazo compose to use it first (Yandex → Unsplash → image-generate) so RU subjects get relevant photos.

**Architecture:** Small Express service on landing VPS `:3021` wraps Yandex Search API `images-xml` and returns JSON hits. Pokazo API calls `YANDEX_IMAGES_URL/search`, downloads chosen `imageUrl` into `workDir/public/`, and updates compose/hero skill order. Not registered in Cursor MCP.

**Tech Stack:** Node 22 ESM, Express 5, Vitest, AI SDK tools, Yandex Cloud Search API (`images-xml`), Docker Compose on `91.207.75.72`.

**Spec:** `docs/superpowers/specs/2026-10-08-yandex-images-stock-design.md`

## Global Constraints

- Compose order is always **Yandex → Unsplash → image-generate** (spec D4).
- Pokazo does **not** call `images-xml` directly; only the VPS service does (spec D2).
- No Cursor `mcp.json` entry (spec D3).
- Local Slidev `image:` paths only; never remote URLs in decks.
- Search/download timeout ~15s; any Yandex failure degrades to Unsplash (then generate).
- Attribution MVP: `source: "yandex"` + `pageUrl` + `imageUrl` + `title` + `query` (spec D5).
- Do not commit secrets, `.env`, e2e screenshots, or `tmp-export-verify/`.

---

## File map

| Path | Role |
|------|------|
| `~/mcp/servers/yandex-images/index.mjs` | Express `/health` + `/search`, XML→JSON |
| `~/mcp/servers/yandex-images/package.json` | deps: express |
| `~/mcp/servers/yandex-images/Dockerfile` | node:22, port 3021 |
| `~/mcp/servers/yandex-images/docker-compose.yml` | publish 3021 |
| `~/mcp/servers/yandex-images/README.md` | deploy + env |
| `~/mcp/servers/yandex-images/fixtures/sample-images.xml` | parser fixture |
| `apps/api/src/assets-yandex.ts` | HTTP client + download to public |
| `apps/api/src/assets-yandex.test.ts` | client unit tests |
| `apps/api/src/assets-yandex-tools.ts` | `yandex-image-search` / `yandex-image-download` |
| `apps/api/src/assets-yandex-tools.test.ts` | tool unit tests |
| `apps/api/src/env.ts` | `yandexImagesUrl` |
| `.env.example` | `YANDEX_IMAGES_URL` |
| `apps/api/src/generate.ts` | merge yandex tools |
| `apps/api/src/generate-helpers.ts` | hero allowlist |
| `apps/api/src/compose-skill.ts` | Yandex-first policy + RU imageQuery |
| `apps/api/src/compose-skill.test.ts` | prompt contracts |
| `apps/api/src/hero-skill.ts` | same pipeline for slide 1 |
| `apps/api/src/assets-tools.ts` | Unsplash tool text: second after Yandex |
| `apps/api/src/assets-gen-tools.ts` | generate after Yandex+Unsplash |

---

### Task 1: VPS `yandex-images` HTTP service

**Repo:** `~/mcp` (not pokazo-app). Create under `servers/yandex-images/`.

**Files:**
- Create: `~/mcp/servers/yandex-images/package.json`
- Create: `~/mcp/servers/yandex-images/index.mjs`
- Create: `~/mcp/servers/yandex-images/fixtures/sample-images.xml`
- Create: `~/mcp/servers/yandex-images/Dockerfile`
- Create: `~/mcp/servers/yandex-images/docker-compose.yml`
- Create: `~/mcp/servers/yandex-images/README.md`
- Create: `~/mcp/servers/yandex-images/.env.example`

**Interfaces:**
- Consumes: `YANDEX_SEARCH_API_KEY`, `YANDEX_FOLDER_ID`; upstream `GET https://yandex.ru/images-xml`
- Produces: `GET /health` → `{ ok: true }`; `POST /search` → `{ query, hits: YandexHit[] }` where each hit is `{ id, title, imageUrl, thumbUrl, pageUrl, width, height, domain }`

- [ ] **Step 1: Scaffold package.json**

```json
{
  "name": "yandex-images",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "index.mjs",
  "engines": { "node": ">=18" },
  "scripts": {
    "start": "node index.mjs",
    "test:parse": "node --test parse.test.mjs"
  },
  "dependencies": {
    "express": "^5.0.0"
  }
}
```

- [ ] **Step 2: Add XML fixture** (`fixtures/sample-images.xml`)

Use a minimal synthetic fixture matching fields the parser will read (tag names aligned with Yandex Images XML: `url`, `domain`, `title`, `image-link`, `image-thumb`, `image-width`, `image-height` inside each `doc`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<yandexsearch>
  <response>
    <results>
      <grouping>
        <group>
          <doc id="Z-uaz1">
            <url>https://www.uaz.ru/patriot</url>
            <domain>www.uaz.ru</domain>
            <title>УАЗ Патриот</title>
            <image-properties>
              <image-link>https://cdn.example/uaz-patriot.jpg</image-link>
              <image-thumb>https://avatars.mds.yandex.net/i?id=thumb1</image-thumb>
              <image-width>1600</image-width>
              <image-height>900</image-height>
            </image-properties>
          </doc>
        </group>
        <group>
          <doc id="Z-uaz2">
            <url>https://auto.ru/uaz/patriot/</url>
            <domain>auto.ru</domain>
            <title>УАЗ Patriot 2024</title>
            <image-properties>
              <image-link>https://cdn.example/patriot-2.jpg</image-link>
              <image-thumb>https://avatars.mds.yandex.net/i?id=thumb2</image-thumb>
              <image-width>1200</image-width>
              <image-height>800</image-height>
            </image-properties>
          </doc>
        </group>
      </grouping>
    </results>
  </response>
</yandexsearch>
```

If a live smoke against `images-xml` shows different tag names, update the parser **and** this fixture to match reality before Task 2.

- [ ] **Step 3: Implement `index.mjs`**

```js
#!/usr/bin/env node
import express from "express";
import { createHash } from "node:crypto";

const PORT = Number(process.env.PORT || 3021);
const API_KEY = process.env.YANDEX_SEARCH_API_KEY || "";
const FOLDER_ID = process.env.YANDEX_FOLDER_ID || "";

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
}

export function parseImagesXml(xml, limit = 5) {
  const docs = [...xml.matchAll(/<doc\b[^>]*>([\s\S]*?)<\/doc>/gi)].map((m) => m[1]);
  const hits = [];
  for (const doc of docs) {
    const imageUrl = tag(doc, "image-link");
    if (!imageUrl) continue;
    const pageUrl = tag(doc, "url");
    const title = tag(doc, "title");
    const domain = tag(doc, "domain");
    const thumbUrl = tag(doc, "image-thumb") || imageUrl;
    const width = Number(tag(doc, "image-width")) || 0;
    const height = Number(tag(doc, "image-height")) || 0;
    const id = createHash("sha1").update(imageUrl).digest("hex").slice(0, 16);
    hits.push({ id, title, imageUrl, thumbUrl, pageUrl, width, height, domain });
    if (hits.length >= limit) break;
  }
  return hits;
}

function requireCreds() {
  if (!API_KEY || !FOLDER_ID) {
    const err = new Error("YANDEX_SEARCH_API_KEY and YANDEX_FOLDER_ID required");
    err.status = 500;
    throw err;
  }
}

async function searchUpstream(opts) {
  requireCreds();
  const params = new URLSearchParams({
    folderid: FOLDER_ID,
    apikey: API_KEY,
    text: opts.query,
    "groupby": "attr=ii.groups-on-page=" + String(opts.count),
  });
  if (opts.page != null) params.set("p", String(opts.page));
  if (opts.site) params.set("site", opts.site);
  if (opts.orientation === "horizontal") params.set("iorient", "horizontal");
  if (opts.orientation === "vertical") params.set("iorient", "vertical");
  if (opts.orientation === "square") params.set("iorient", "square");
  if (opts.size) params.set("isize", opts.size);
  if (opts.familyMode === "strict") params.set("fyandex", "1");
  if (opts.familyMode === "none") params.set("fyandex", "0");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`https://yandex.ru/images-xml?${params}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/xml,text/xml,*/*" },
    });
    const body = await res.text();
    if (!res.ok) {
      const err = new Error(`images-xml ${res.status}: ${body.slice(0, 200)}`);
      err.status = 502;
      throw err;
    }
    return parseImagesXml(body, opts.count);
  } finally {
    clearTimeout(timer);
  }
}

const app = express();
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "yandex-images" });
});

app.post("/search", async (req, res) => {
  try {
    const query = String(req.body?.query ?? "").trim();
    if (!query) return res.status(400).json({ error: "query required" });
    const count = Math.min(10, Math.max(1, Number(req.body?.count) || 5));
    const hits = await searchUpstream({
      query,
      count,
      orientation: req.body?.orientation,
      size: req.body?.size,
      familyMode: req.body?.familyMode,
      site: req.body?.site,
      page: req.body?.page,
    });
    res.json({ query, hits });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("index.mjs")) {
  app.listen(PORT, () => console.log(`yandex-images on :${PORT}`));
}
```

Fix the listen guard if needed for Node ESM (`import.meta.url` vs `pathToFileURL(process.argv[1]).href`). Prefer:

```js
import { pathToFileURL } from "node:url";
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) app.listen(PORT, () => console.log(`yandex-images on :${PORT}`));
```

- [ ] **Step 4: Add parse unit test** `parse.test.mjs`

```js
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImagesXml } from "./index.mjs";

test("parseImagesXml extracts hits", () => {
  const xml = readFileSync(new URL("./fixtures/sample-images.xml", import.meta.url), "utf8");
  const hits = parseImagesXml(xml, 5);
  assert.equal(hits.length, 2);
  assert.equal(hits[0].domain, "www.uaz.ru");
  assert.match(hits[0].imageUrl, /uaz-patriot/);
  assert.ok(hits[0].id.length >= 8);
});
```

- [ ] **Step 5: Run parse test**

Run: `cd ~/mcp/servers/yandex-images && npm install && node --test parse.test.mjs`  
Expected: PASS

- [ ] **Step 6: Docker files**

`Dockerfile`:

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY index.mjs ./
ENV NODE_ENV=production
EXPOSE 3021
USER node
CMD ["node", "index.mjs"]
```

`docker-compose.yml`:

```yaml
services:
  yandex-images:
    build: .
    image: yandex-images:local
    container_name: yandex-images
    restart: unless-stopped
    ports:
      - "3021:3021"
    env_file: .env
```

`.env.example`:

```env
YANDEX_SEARCH_API_KEY=
YANDEX_FOLDER_ID=
PORT=3021
```

`README.md`: document copy `.env` from wordstat/search keys, `docker compose up -d --build`, curl health + search.

- [ ] **Step 7: Deploy on VPS `91.207.75.72`**

```bash
# from machine with SSH access — adjust path to match how other MCP images are deployed
rsync -av --exclude node_modules ~/mcp/servers/yandex-images/ user@91.207.75.72:~/yandex-images/
ssh user@91.207.75.72 'cd ~/yandex-images && cp -n ../wordstat-mcp/.env .env 2>/dev/null; docker compose up -d --build'
```

Use the same deploy path/user the operator already uses for webmaster/wordstat. Ensure `.env` has the Search API key + folder id.

- [ ] **Step 8: Smoke**

```bash
curl -sS http://91.207.75.72:3021/health
curl -sS -X POST http://91.207.75.72:3021/search \
  -H 'content-type: application/json' \
  -d '{"query":"УАЗ Патриот","count":3,"orientation":"horizontal"}'
```

Expected: `ok: true`; hits with `imageUrl`/`pageUrl` relevant to УАЗ.

If XML tags differ, fix parser against the live body (save a redacted fixture), re-deploy, re-smoke.

- [ ] **Step 9: Commit in `~/mcp` repo**

```bash
cd ~/mcp
git add servers/yandex-images
git commit -m "$(cat <<'EOF'
feat(yandex-images): HTTP search service for Pokazo stock

EOF
)"
git push
```

---

### Task 2: Pokazo `assets-yandex` client

**Files:**
- Create: `apps/api/src/assets-yandex.ts`
- Create: `apps/api/src/assets-yandex.test.ts`
- Modify: `apps/api/src/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `config.yandexImagesUrl`, service `POST /search`
- Produces:
  - `export type YandexImageHit = { id: string; title: string; imageUrl: string; thumbUrl: string; pageUrl: string; width: number; height: number; domain: string }`
  - `searchYandexImages(opts: { baseUrl: string; query: string; count?: number; orientation?: "horizontal" | "vertical" | "square"; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<YandexImageHit[]>`
  - `downloadYandexImageToPublic(opts: { workDir: string; url: string; filename: string; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<{ path: string; file: string }>`

- [ ] **Step 1: Write failing tests** (`assets-yandex.test.ts`)

```ts
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { downloadYandexImageToPublic, searchYandexImages } from "./assets-yandex.js";

describe("searchYandexImages", () => {
  it("POSTs /search and maps hits", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe("http://images.test/search");
      expect(init?.method).toBe("POST");
      return new Response(
        JSON.stringify({
          query: "УАЗ",
          hits: [
            {
              id: "abc",
              title: "УАЗ Патриот",
              imageUrl: "https://cdn.example/a.jpg",
              thumbUrl: "https://cdn.example/a-t.jpg",
              pageUrl: "https://uaz.ru/p",
              width: 1600,
              height: 900,
              domain: "uaz.ru",
            },
          ],
        }),
        { status: 200 },
      );
    });
    const hits = await searchYandexImages({
      baseUrl: "http://images.test",
      query: "УАЗ",
      count: 3,
      orientation: "horizontal",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.domain).toBe("uaz.ru");
  });

  it("throws on non-OK", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "down" }), { status: 502 }));
    await expect(
      searchYandexImages({
        baseUrl: "http://images.test",
        query: "x",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/502|yandex-images/i);
  });
});

describe("downloadYandexImageToPublic", () => {
  it("writes bytes under public/", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "pk-yandex-"));
    const fetchImpl = vi.fn(async () => new Response(Buffer.from("JPEGDATA"), { status: 200 }));
    const result = await downloadYandexImageToPublic({
      workDir,
      url: "https://cdn.example/a.jpg",
      filename: "slide-2.jpg",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.path).toBe("/slide-2.jpg");
    expect(await readFile(join(workDir, "public", "slide-2.jpg"), "utf8")).toBe("JPEGDATA");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd apps/api && pnpm exec vitest run src/assets-yandex.test.ts`  
Expected: FAIL module not found / export missing

- [ ] **Step 3: Implement `assets-yandex.ts`**

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { safePublicPath } from "./assets-stock.js";

export type YandexImageHit = {
  id: string;
  title: string;
  imageUrl: string;
  thumbUrl: string;
  pageUrl: string;
  width: number;
  height: number;
  domain: string;
};

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

export async function searchYandexImages(opts: {
  baseUrl: string;
  query: string;
  count?: number;
  orientation?: "horizontal" | "vertical" | "square";
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<YandexImageHit[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, "");
  const res = await fetchImpl(`${base}/search`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: opts.query,
      count: opts.count ?? 5,
      orientation: opts.orientation ?? "horizontal",
    }),
    signal: withTimeout(opts.timeoutMs ?? 15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`yandex-images search ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { hits?: YandexImageHit[] };
  return Array.isArray(data.hits) ? data.hits : [];
}

export async function downloadYandexImageToPublic(opts: {
  workDir: string;
  url: string;
  filename: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<{ path: string; file: string }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const file = safePublicPath(opts.workDir, opts.filename);
  await mkdir(join(opts.workDir, "public"), { recursive: true });
  const res = await fetchImpl(opts.url, { signal: withTimeout(opts.timeoutMs ?? 15_000) });
  if (!res.ok) throw new Error(`yandex-images download ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return { path: `/${basename(file)}`, file };
}
```

- [ ] **Step 4: Wire env**

In `env.ts` add:

```ts
yandexImagesUrl: env("YANDEX_IMAGES_URL"),
```

In `.env.example` after Yandex folder id:

```env
# Yandex Images HTTP service (landing VPS) — empty disables yandex-image-* tools
# YANDEX_IMAGES_URL=http://91.207.75.72:3021
YANDEX_IMAGES_URL=
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `cd apps/api && pnpm exec vitest run src/assets-yandex.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/assets-yandex.ts apps/api/src/assets-yandex.test.ts apps/api/src/env.ts .env.example
git commit -m "$(cat <<'EOF'
feat(api): Yandex Images HTTP client for stock photos

EOF
)"
```

---

### Task 3: Compose tools `yandex-image-search` / `yandex-image-download`

**Files:**
- Create: `apps/api/src/assets-yandex-tools.ts`
- Create: `apps/api/src/assets-yandex-tools.test.ts`
- Modify: `apps/api/src/generate.ts`
- Modify: `apps/api/src/generate-helpers.ts`
- Modify: `apps/api/src/generate-helpers.test.ts` (if assertions list tool names)
- Modify: `apps/api/src/assets-tools.ts` (tool description: second after Yandex)
- Modify: `apps/api/src/assets-gen-tools.ts` (description: after Yandex+Unsplash)

**Interfaces:**
- Consumes: `searchYandexImages`, `downloadYandexImageToPublic`, `config.yandexImagesUrl`
- Produces: `createYandexImageTools(workDir, opts) → { "yandex-image-search", "yandex-image-download" }`
- Attribution type: `{ source: "yandex"; path: string; id?: string; query?: string; title?: string; pageUrl?: string; imageUrl?: string; photographer: string; attributionUrl: string }`

- [ ] **Step 1: Failing tool tests**

```ts
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createYandexImageTools } from "./assets-yandex-tools.js";

describe("createYandexImageTools", () => {
  it("returns config error when baseUrl empty", async () => {
    const tools = createYandexImageTools("/tmp/deck", { baseUrl: "" });
    const search = tools["yandex-image-search"] as {
      execute: (args: { query: string }) => Promise<{ error?: string }>;
    };
    const out = await search.execute({ query: "УАЗ" });
    expect(out.error).toMatch(/YANDEX_IMAGES_URL/);
  });

  it("search caches hit and download writes path", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "pk-yt-"));
    const attributions: unknown[] = [];
    const tools = createYandexImageTools(workDir, {
      baseUrl: "http://images.test",
      search: async () => [
        {
          id: "h1",
          title: "УАЗ Патриот",
          imageUrl: "https://cdn.example/a.jpg",
          thumbUrl: "https://cdn.example/t.jpg",
          pageUrl: "https://uaz.ru/p",
          width: 1600,
          height: 900,
          domain: "uaz.ru",
        },
      ],
      download: async ({ filename }) => ({
        path: `/${filename}`,
        file: join(workDir, "public", filename),
      }),
      onAttribution: (e) => attributions.push(e),
    });
    const search = tools["yandex-image-search"] as {
      execute: (a: { query: string }) => Promise<Array<{ id: string; title: string }>>;
    };
    const hits = await search.execute({ query: "УАЗ Патриот" });
    expect(hits[0]?.id).toBe("h1");
    const dl = tools["yandex-image-download"] as {
      execute: (a: { id: string; filename: string }) => Promise<{ path: string; source: string }>;
    };
    const out = await dl.execute({ id: "h1", filename: "slide-2.jpg" });
    expect(out.path).toBe("/slide-2.jpg");
    expect(out.source).toBe("yandex");
    expect(attributions[0]).toMatchObject({ source: "yandex", pageUrl: "https://uaz.ru/p" });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/api && pnpm exec vitest run src/assets-yandex-tools.test.ts`  
Expected: FAIL missing module

- [ ] **Step 3: Implement `assets-yandex-tools.ts`**

Mirror `createStockTools` patterns: injectable `search`/`download`, in-memory `Map` cache by id, structured `{ error }` (do not throw from execute).

Tool descriptions (exact policy text):

- `yandex-image-search`: "FIRST photo search for RU-relevant subjects via Yandex Images. Prefer natural Russian query naming the exact subject. Returns id, title, domain, pageUrl, thumb. Judge relevance from title/domain/pageUrl. If empty OR wrong subject OR error → stock-search (Unsplash). Do not skip photos for the rest of the deck."
- `yandex-image-download`: "Download a Yandex Images hit into deck public/. Pass id from yandex-image-search. filename basename like slide-2.jpg. Returns path for Slidev image:. If download fails, try another id once, else Unsplash."

Attribution mapping:

```ts
photographer: hit.domain || "Yandex Images",
attributionUrl: hit.pageUrl || hit.imageUrl,
source: "yandex",
title: hit.title,
pageUrl: hit.pageUrl,
imageUrl: hit.imageUrl,
query,
```

- [ ] **Step 4: Wire `generate.ts`**

```ts
import { createYandexImageTools } from "./assets-yandex-tools.js";

const yandexTools = createYandexImageTools(opts.workDir, {
  baseUrl: config.yandexImagesUrl,
  onAttribution: (entry) => attributions.push(entry),
});

// hero + compose merges:
mergeComposeTools(slidevTools, yandexTools, stockTools, imageGenTools)
```

Apply in all three merge sites (hero, compose, repair) in `generate.ts`.

- [ ] **Step 5: Hero allowlist**

In `generate-helpers.ts` add to `HERO_TOOL_ALLOW`:

```ts
"yandex-image-search",
"yandex-image-download",
```

Update `generate-helpers.test.ts` if it asserts allowlist membership / merge names.

- [ ] **Step 6: Soften Unsplash + generate descriptions**

`assets-tools.ts` `stock-search` description: start with "SECOND photo search after yandex-image-search…" and "If yandex failed/empty/wrong, search Unsplash… then image-generate".

`assets-gen-tools.ts` `image-generate` description: "Use when yandex-image-search and stock-search are empty OR wrong subject…"

- [ ] **Step 7: Run tests**

Run:

```bash
cd apps/api && pnpm exec vitest run src/assets-yandex-tools.test.ts src/generate-helpers.test.ts src/assets-tools.test.ts src/assets-gen-tools.test.ts
```

Expected: PASS (update any description-sensitive tests if present)

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/assets-yandex-tools.ts apps/api/src/assets-yandex-tools.test.ts \
  apps/api/src/generate.ts apps/api/src/generate-helpers.ts apps/api/src/generate-helpers.test.ts \
  apps/api/src/assets-tools.ts apps/api/src/assets-gen-tools.ts
git commit -m "$(cat <<'EOF'
feat(api): compose tools for Yandex Images search/download

EOF
)"
```

---

### Task 4: Compose / hero / outline policy (Yandex first)

**Files:**
- Modify: `apps/api/src/compose-skill.ts`
- Modify: `apps/api/src/compose-skill.test.ts`
- Modify: `apps/api/src/hero-skill.ts`
- Create or modify: `apps/api/src/hero-skill.test.ts` (create if missing; add pipeline assertions)

**Interfaces:**
- Consumes: tool names from Task 3
- Produces: prompt text encoding order Yandex → Unsplash → generate; for `locale=ru`, outline `imageQuery` in Russian

- [ ] **Step 1: Update failing prompt contract tests**

In `compose-skill.test.ts` add/adjust:

```ts
it("requires Yandex-first then Unsplash then image-generate", () => {
  const skill = composeSkill("shibainu", "ru");
  expect(skill).toMatch(/yandex-image-search/);
  expect(skill).toMatch(/yandex-image-download/);
  expect(skill).toMatch(/Yandex[\s\S]*stock-search[\s\S]*image-generate|yandex-image-search[\s\S]*stock-search[\s\S]*image-generate/i);
  expect(skill).toMatch(/title\/domain\/pageUrl|wrong subject/i);
});
```

Update outline test that currently requires English-only imageQuery: for `locale=ru` expect Russian guidance, e.g. match `/русск|Russian query|imageQuery.*рус/i` or explicit line from the new prompt. Keep English Unsplash retry language.

Add hero-skill test asserting `yandex-image-search` appears before `stock-search` in the photo pipeline section.

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/api && pnpm exec vitest run src/compose-skill.test.ts src/hero-skill.test.ts`  
Expected: FAIL on new assertions

- [ ] **Step 3: Patch `composeSkill` tools + photo pipeline**

Replace Tools / Photo slides sections with:

```text
Tools:
- Slidev MCP: ...
- Yandex Images (FIRST): yandex-image-search, yandex-image-download. Prefer natural Russian query. Judge title/domain/pageUrl.
- Unsplash (SECOND): stock-search, stock-download. English query. Judge description/altDescription.
- OpenAI image-generate (LAST): when Yandex and Unsplash are empty OR wrong subject. ...

Photo slides (...):
  1) yandex-image-search (Russian/natural query from imageQuery when locale is Russian; orientation landscape→horizontal)
  2) Judge title/domain/pageUrl. If empty/wrong/error → stock-search (English)
  3) Judge Unsplash description/altDescription. If empty/wrong → image-generate (... slide-N-gen.png)
  4) Else yandex-image-download or stock-download → image: /slide-N.jpg
```

Also update `composeUserPrompt` repair/photo lines that say `stock-search → …` to the new order.

- [ ] **Step 4: Outline imageQuery language**

In outline instructions inside `compose-skill.ts` (and any duplicate in outline prompts): for Russian locale, `imageQuery` should be a **Russian** 4–8 word subject query (for Yandex); note compose may also try English Unsplash. Update `outlineUserPrompt` test accordingly.

- [ ] **Step 5: Patch `heroSkill` + `heroUserPrompt`**

Same Yandex-first pipeline for slide 1; filename `slide-1.jpg` / `slide-1-gen.png`.

- [ ] **Step 6: Run prompt + related tests**

Run:

```bash
cd apps/api && pnpm exec vitest run src/compose-skill.test.ts src/hero-skill.test.ts src/assets-pipeline.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/compose-skill.ts apps/api/src/compose-skill.test.ts \
  apps/api/src/hero-skill.ts apps/api/src/hero-skill.test.ts
git commit -m "$(cat <<'EOF'
feat(api): prefer Yandex Images before Unsplash in compose

EOF
)"
```

---

### Task 5: Prod env + smoke

**Files:**
- Modify: prod/API env on deploy host (not in git) — set `YANDEX_IMAGES_URL=http://91.207.75.72:3021`
- Optional: note in `docs/functionality.md` or deploy README one line if such docs list Unsplash egress

- [ ] **Step 1: Set prod env**

On API host (or docker compose env for pokazo API), add:

```env
YANDEX_IMAGES_URL=http://91.207.75.72:3021
```

Ensure API can reach landing VPS `:3021` (same path as Unsplash egress `8788`).

- [ ] **Step 2: Deploy Pokazo API** via normal GitHub CI / existing deploy (no manual jar scp unless user asks hotfix).

- [ ] **Step 3: Manual smoke**

Generate a deck topic `УАЗ Патриот 2024` (or use existing smoke script). Confirm logs show `yandex-image-search` tool calls and at least one attribution `source: "yandex"` in `assets.json`, or fallthrough to Unsplash/generate without hard failure.

- [ ] **Step 4: Commit any doc-only env notes** (if touched)

```bash
git add docs/ # only if docs changed
git commit -m "$(cat <<'EOF'
docs: note YANDEX_IMAGES_URL for stock pipeline

EOF
)"
```

---

## Self-review vs spec

| Spec item | Task |
|-----------|------|
| D1 images-xml | Task 1 |
| D2 HTTP service, Pokazo via HTTP | Task 1–2 |
| D3 no Cursor MCP | Task 1 README + Global Constraints |
| D4 Yandex → Unsplash → generate | Task 3–4 |
| D5 attribution MVP | Task 3 |
| D6 REST not MCP JSON-RPC | Task 1 `/search` |
| Degrade on failure | Task 2–3 error shapes + Task 4 prompts |
| Vitest client/tools + skill text | Task 2–4 |
| Deploy :3021 + env | Task 1 + 5 |
| Local public/ only | Task 2–3 download |

No TBD placeholders. Types consistent: `YandexImageHit` shared by client and tools.
`}