/** Forward player anim debug when the view URL has ?pkDebugAnim=1. */
export function embedDebugQuery(): string {
  if (typeof window === "undefined") return "";
  return /(?:^|[?&])pkDebugAnim=1(?:&|$)/.test(window.location.search) ? "&pkDebugAnim=1" : "";
}

export function embedDeckUrl(embedBase: string): string {
  const base = embedBase.endsWith("/") ? embedBase : `${embedBase}/`;
  return `${base}?embedded${embedDebugQuery()}`;
}

export function embedSlideUrl(embedBase: string, index: number): string {
  const base = embedBase.endsWith("/") ? embedBase : `${embedBase}/`;
  return `${base}${index}?embedded${embedDebugQuery()}`;
}

export function slidevNavigateMessage(page: number) {
  return { target: "slidev" as const, type: "navigate" as const, no: page, clicks: 0 };
}

/**
 * Post navigate again after the iframe document reloads (Slidev HMR), even
 * when the selected page number did not change. Otherwise the player boots
 * on page 1 and the filmstrip stays on the moved slide.
 */
export function stageNavShouldPost(opts: {
  lastPosted: number | null;
  page: number;
  postedLoad: number;
  stageLoad: number;
}): boolean {
  return opts.lastPosted !== opts.page || opts.postedLoad !== opts.stageLoad;
}

/** Outline thumb index → Slidev page (uses slidevIndex when API provides it). */
export function slidevPageForOutlineIndex(
  slides: Array<{ index: number; slidevIndex?: number }>,
  outlineIndex: number,
): number {
  const hit = slides.find((s) => s.index === outlineIndex);
  const page = hit?.slidevIndex ?? hit?.index ?? outlineIndex;
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : outlineIndex;
}
