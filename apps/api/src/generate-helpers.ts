export function composeMaxSteps(slideCount: number): number {
  // base + ~3 slidev ops + ~2 stock ops per slide
  return Math.min(64, Math.max(24, slideCount * 5 + 12));
}

export function mergeComposeTools(
  slidev: Record<string, unknown>,
  stock: Record<string, unknown>,
): Record<string, unknown> {
  return { ...slidev, ...stock };
}
