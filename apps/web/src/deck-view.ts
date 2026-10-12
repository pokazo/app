export function embedDeckUrl(embedBase: string): string {
  const base = embedBase.endsWith("/") ? embedBase : `${embedBase}/`;
  return `${base}?embedded`;
}

export function embedSlideUrl(embedBase: string, index: number): string {
  const base = embedBase.endsWith("/") ? embedBase : `${embedBase}/`;
  return `${base}${index}?embedded`;
}

export function slidevNavigateMessage(page: number) {
  return { target: "slidev" as const, type: "navigate" as const, no: page, clicks: 0 };
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
