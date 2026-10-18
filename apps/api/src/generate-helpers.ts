export function composeMaxSteps(slideCount: number): number {
  // leaner budget: 1 photo pipeline + 1 insert per slide, plus small overhead
  return Math.min(48, Math.max(16, slideCount * 4 + 6));
}

export function mergeComposeTools(...maps: Record<string, unknown>[]): Record<string, unknown> {
  return Object.assign({}, ...maps);
}

const COMPOSE_LAYOUT_ALLOW = new Set(["layout-list", "layout-get", "layout-match"]);

/** Compose: layout catalog only — no outline-validate (that is the outline agent). */
export function pickComposeLayoutTools(tools: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (COMPOSE_LAYOUT_ALLOW.has(name)) out[name] = tool;
  }
  return out;
}

/** Playwright layout gate is for the final dist, not hero/progressive preview. */
export function shouldRunLayoutRenderGate(label: string): boolean {
  return label !== "preview" && label !== "progressive";
}

const HERO_TOOL_ALLOW = new Set([
  "hero-list",
  "hero-get",
  "slidev-update-slide",
  "upload-image-list",
  "upload-image-search",
  "upload-image-use",
  "yandex-image-search",
  "yandex-image-download",
  "stock-search",
  "stock-download",
  "image-generate",
]);

/** Hero phase: update slide 1 + assets only — no insert/remove/move/inspect. */
export function pickHeroTools(tools: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (HERO_TOOL_ALLOW.has(name)) out[name] = tool;
  }
  return out;
}

const COMPOSE_INSPECT_STUB = new Set(["slidev-get-info", "slidev-get-slide"]);

type ToolLike = { execute?: (...args: unknown[]) => unknown; description?: string };

/** Compose phase: stub inspect tools so the model cannot sweep every slide. */
export function stripComposeInspectTools(tools: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...tools };
  for (const name of COMPOSE_INSPECT_STUB) {
    const prev = out[name] as ToolLike | undefined;
    if (!prev || typeof prev !== "object") continue;
    out[name] = {
      ...prev,
      description:
        "DISABLED during compose. Do not call. Use slidev-list-slides once after inserts to verify count.",
      execute: async () => ({
        error: "inspect disabled — use slidev-list-slides once, then finish or insert/update",
      }),
    };
  }
  return out;
}

/** Body-slide rewrite: get/update + layout catalog + assets — no hero catalog, no insert/remove/move. */
const REWRITE_TOOL_ALLOW = new Set([
  "slidev-get-slide",
  "slidev-update-slide",
  "layout-list",
  "layout-get",
  "layout-match",
  "upload-image-list",
  "upload-image-search",
  "upload-image-use",
  "yandex-image-search",
  "yandex-image-download",
  "stock-search",
  "stock-download",
  "image-generate",
]);

/** Body rewrite only — hero rewrite uses pickHeroTools. */
export function pickRewriteTools(tools: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (REWRITE_TOOL_ALLOW.has(name)) out[name] = tool;
  }
  return out;
}
