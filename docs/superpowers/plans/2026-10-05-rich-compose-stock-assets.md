# Rich compose + stock assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) with TDD per step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visually varied Slidev decks via richer outline + compose that uses Slidev MCP and Unsplash stock downloads into `workDir/public/`.

**Architecture:** Outline becomes intent/visual hints. Compose gets Slidev MCP tools plus in-process `stock-search` / `stock-download` AI SDK tools. MdGuard allows `image-left` and local `/…` image paths only. Icons via UnoCSS packs (allowlisted), no icon MCP.

**Tech Stack:** Vitest, Zod, AI SDK `tool`/`generateObject`/`generateText`, Unsplash API, `@slidev/cli` MCP, existing `apps/api` worker.

**Spec:** `docs/superpowers/specs/2026-10-05-rich-compose-stock-assets-design.md`

## Global Constraints

- Stock provider v1: Unsplash only (`UNSPLASH_ACCESS_KEY`)
- No remote image URLs in built decks — download to `workDir/public/`
- No AI image gen, no Pexels, no arbitrary Vue/SFC
- TDD: failing test before production code each task
- Do not commit unless user asks

## File map

| File | Role |
|------|------|
| `apps/api/src/outline.ts` | Zod Outline schema + export |
| `apps/api/src/outline.test.ts` | Schema tests |
| `apps/api/src/assets-stock.ts` | Unsplash search/download + safe path |
| `apps/api/src/assets-stock.test.ts` | Unit tests (mock fetch) |
| `apps/api/src/assets-tools.ts` | AI SDK tools wrapping stock |
| `apps/api/src/assets-tools.test.ts` | Tool execute tests |
| `apps/api/src/md-guard.ts` | layouts + local image + icon allow |
| `apps/api/src/health.test.ts` or `md-guard` tests | guard cases |
| `apps/api/src/compose-skill.ts` | system prompt builder |
| `apps/api/src/compose-skill.test.ts` | prompt contains rules |
| `apps/api/src/generate.ts` | wire outline + tools + skill |
| `apps/api/src/env.ts` | `unsplashAccessKey` |
| `apps/api/package.json` | icon packs if needed for icons task |

---

### Task 1: Rich outline Zod schema

**Files:**
- Create: `apps/api/src/outline.ts`
- Create: `apps/api/src/outline.test.ts`
- Modify: `apps/api/src/generate.ts` (import Outline from outline.ts)

**Produces:** `Outline` zod schema with `visual`, `points`, `intent`, optional `imageQuery`/`iconHint`

- [ ] **Step 1: Failing test** — valid rich slide + reject >5 points
- [ ] **Step 2: Implement schema**
- [ ] **Step 3: Tests pass; switch generate.ts import**

### Task 2: Safe stock download + Unsplash client

**Files:**
- Create: `apps/api/src/assets-stock.ts`
- Create: `apps/api/src/assets-stock.test.ts`
- Modify: `apps/api/src/env.ts`

**Produces:** `safePublicPath`, `searchUnsplash`, `downloadStockToPublic`

- [ ] **Step 1: Failing tests** — path traversal blocked; download writes under public/
- [ ] **Step 2: Implement with injectable fetch**
- [ ] **Step 3: Tests pass**

### Task 3: AI SDK stock tools

**Files:**
- Create: `apps/api/src/assets-tools.ts`
- Create: `apps/api/src/assets-tools.test.ts`

**Produces:** `createStockTools(workDir, opts)` → `{ "stock-search", "stock-download" }` or `{}` if no key

- [ ] **Step 1: Failing test** — no key → empty; with mock → download tool writes file
- [ ] **Step 2: Implement**
- [ ] **Step 3: Tests pass**

### Task 4: MdGuard local images + image-left

**Files:**
- Modify: `apps/api/src/md-guard.ts`
- Modify: `apps/api/src/health.test.ts` (or themes/md-guard tests)

**Produces:** allow `image-left`; strip/rewrite `image: http…` to safe; keep local `/x.jpg`

- [ ] **Step 1: Failing tests**
- [ ] **Step 2: Implement**
- [ ] **Step 3: Tests pass**

### Task 5: Compose skill prompt

**Files:**
- Create: `apps/api/src/compose-skill.ts`
- Create: `apps/api/src/compose-skill.test.ts`
- Modify: `apps/api/src/generate.ts`

**Produces:** skill mentioning stock tools, sequential insert, visual variety, local images

- [ ] **Step 1: Failing test** — skill includes stock-search and sequential insert
- [ ] **Step 2: Implement**
- [ ] **Step 3: Wire generate; tests pass**

### Task 6: Wire generateDeck

**Files:**
- Modify: `apps/api/src/generate.ts`
- Create: `apps/api/src/generate-wire.test.ts` (unit: merge tools keys / maxSteps helper)

**Produces:** outline uses new schema; compose merges slidev + stock tools; writes `assets.json` attributions; higher maxSteps

- [ ] **Step 1: Failing test** for `composeMaxSteps(slideCount)` and tool merge helper
- [ ] **Step 2: Implement helpers + generate wiring**
- [ ] **Step 3: Full `pnpm --filter @pokazo/api test` green**

### Task 7: Icons allowlist (minimal)

**Files:**
- Modify: `apps/api/src/md-guard.ts` + tests
- Modify: `apps/api/package.json` if adding `@iconify-json/carbon` (only if build needs it)

**Produces:** allow `<carbon-*>` or known icon patterns; strip unknown custom tags that look like SFC

- [ ] **Step 1–3:** TDD allow carbon icon tag, strip `<EvilWidget>`

### Task 8: Live smoke (manual script)

**Files:**
- Optional script under `/tmp` or `apps/api/scripts/demo-rich.mts` (not required in repo if user prefers tmp)

- [ ] Run generate with Unsplash key if present; assert ≥1 file in `public/` OR skip with note if no key
- [ ] `slidev build` succeeds

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Rich outline | 1 |
| Unsplash search/download + safe path | 2–3 |
| MdGuard local image / image-left | 4 |
| Compose skill + sequential insert | 5 |
| Wire generate + trace/assets.json | 6 |
| UnoCSS/icons allowlist | 7 |
| Live acceptance | 8 |
| No Pexels / no AI images | constraints |
