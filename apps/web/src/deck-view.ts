export function embedSlideUrl(embedBase: string, index: number): string {
  const base = embedBase.endsWith("/") ? embedBase : `${embedBase}/`;
  return `${base}${index}`;
}
