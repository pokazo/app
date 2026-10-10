# Layout MCP Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Stdio Layout MCP so outline can list/get/match layouts before choosing `visual`.

**Architecture:** Catalog module → MCP server handlers → `withLayoutMcp` client → outline `generateText` + `submit_outline` tool; keep `validateOutlinePlan` + generateObject fallback.

**Tech Stack:** `@modelcontextprotocol/sdk`, AI SDK `experimental_createMCPClient`, vitest, existing Outline zod schema.

## Global Constraints

- Layout ids must match Slidev `layout:` / outline `visual` names used in compose.
- No vision/goldens in v1.
- Do not break existing `generateObject` outline path without a fallback.

---

### Task 1: Catalog + pure handlers

- [ ] Add `apps/api/src/layout-catalog.ts` with all selectable layouts
- [ ] Add `layoutList` / `layoutGet` / `layoutMatch` functions
- [ ] Tests for completeness and match ranking

### Task 2: MCP server + client

- [ ] Add `@modelcontextprotocol/sdk` dependency
- [ ] `layout-mcp-server.ts` stdio
- [ ] `layout-mcp.ts` `withLayoutMcp`
- [ ] package.json script `layout-mcp`

### Task 3: Wire outline generation

- [ ] `submit_outline` tool + outline system prompt requiring layout tools
- [ ] Change `generate.ts` outline phase to use layout MCP
- [ ] Fallback to generateObject+refine if submit missing
- [ ] Unit/integration tests where practical
