export function composeMaxSteps(slideCount: number): number {
  // base + ~3 slidev ops + ~2 stock ops + optional generate per slide
  return Math.min(72, Math.max(24, slideCount * 6 + 12));
}

export function mergeComposeTools(...maps: Record<string, unknown>[]): Record<string, unknown> {
  return Object.assign({}, ...maps);
}

const HERO_TOOL_ALLOW = new Set([
  "slidev-get-info",
  "slidev-list-slides",
  "slidev-get-slide",
  "slidev-update-slide",
  "yandex-image-search",
  "yandex-image-download",
  "stock-search",
  "stock-download",
  "image-generate",
]);

/** Hero phase: update slide 1 + assets only — no insert/remove/move. */
export function pickHeroTools(tools: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (HERO_TOOL_ALLOW.has(name)) out[name] = tool;
  }
  return out;
}
