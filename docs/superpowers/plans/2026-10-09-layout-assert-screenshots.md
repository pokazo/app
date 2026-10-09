# Layout assert + screenshot goldens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layouts throw `LayoutError` on undrawable data; post-build Playwright gate surfaces it to compose repair; golden screenshots cover all 11 custom layouts.

**Architecture:** Shared `layout-assert.ts` copied into each deck; Vue layouts call asserts in `<script setup>`; `assertDeckLayoutsRender` after `buildSlidev` fails the generate pipeline so existing repair runs; vitest + Playwright goldens for visual confidence.

**Tech Stack:** TypeScript, Vue SFC (Slidev), Vitest, Playwright Chromium, pixelmatch/pngjs

## Global Constraints

- Error prefix exactly `LayoutError[<layout>]:`
- Only custom layouts in `apps/api/slidev-layouts/`
- Do not commit secrets or unrelated e2e PNGs
- Screenshot tests may be slower; keep `fileParallelism: false`

---

### Task 1: layout-assert module + unit tests

**Files:**
- Create: `apps/api/slidev-layouts/layout-assert.js`
- Create: `apps/api/src/layout-assert.test.ts`
- Modify: `apps/api/src/slidev.ts` (copy `layout-assert.ts` in `installDeckLayouts`)

- [ ] Implement assert helpers + tests (good pass / bad throw)
- [ ] Update installDeckLayouts to copy the helper

### Task 2: Wire asserts into all 11 Vue layouts

**Files:**
- Modify: `apps/api/slidev-layouts/*.vue`

- [ ] Import and call asserts in each layout
- [ ] Re-run unit tests

### Task 3: Post-build render gate + compose prompt

**Files:**
- Create: `apps/api/src/layout-render-gate.ts`
- Create: `apps/api/src/layout-render-gate.test.ts` (bad stats → throws LayoutError)
- Modify: `apps/api/src/generate.ts` (call gate after build / after repair rebuild)
- Modify: `apps/api/src/compose-skill.ts` + test

### Task 4: Golden screenshot suite

**Files:**
- Create: `apps/api/src/layout-screenshots.test.ts`
- Create: fixture helpers + `apps/api/src/__screenshots__/layouts/`
- Modify: `apps/api/package.json` (pixelmatch, pngjs)

- [ ] Happy-path multi-slide fixture deck
- [ ] Capture/compare; generate goldens once with UPDATE_LAYOUT_SHOTS=1
