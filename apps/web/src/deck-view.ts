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
