/** Known layout palette ids → CSS class `pk-palette-*`. Unknown → cream. */
const KNOWN = new Set([
  "cream",
  "ink",
  "auto",
  "ocean",
  "forest",
  "slate",
  "amber",
  "frost",
  "wine",
]);

export function paletteClass(palette) {
  const id = String(palette ?? "").trim();
  return KNOWN.has(id) ? `pk-palette-${id}` : "pk-palette-cream";
}
