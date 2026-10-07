export function composeMaxSteps(slideCount: number): number {
  // base + ~3 slidev ops + ~2 stock ops + optional generate per slide
  return Math.min(72, Math.max(24, slideCount * 6 + 12));
}

export function mergeComposeTools(...maps: Record<string, unknown>[]): Record<string, unknown> {
  return Object.assign({}, ...maps);
}
