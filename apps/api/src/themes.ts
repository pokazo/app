export const SLIDEV_THEME_IDS = ["default", "seriph", "apple-basic", "bricks", "shibainu"] as const;
/** Layout palette packs (CSS on pk-* layouts). Mapped from picker ids. */
export const LAYOUT_PALETTE_IDS = ["cream", "ink", "auto"] as const;
export const PICKER_THEME_IDS = [
  "auto",
  ...SLIDEV_THEME_IDS,
  "ink-dark",
  "brand-auto",
] as const;

export type PickerThemeId = (typeof PICKER_THEME_IDS)[number];
export type SlidevThemeId = (typeof SLIDEV_THEME_IDS)[number];
export type LayoutPaletteId = (typeof LAYOUT_PALETTE_IDS)[number];

export function sanitizePickerTheme(raw?: string | null): PickerThemeId {
  const id = (raw ?? "").trim();
  return (PICKER_THEME_IDS as readonly string[]).includes(id) ? (id as PickerThemeId) : "auto";
}

export function slidevThemeId(raw?: string | null): SlidevThemeId {
  const pick = sanitizePickerTheme(raw);
  if (pick === "auto" || pick === "ink-dark" || pick === "brand-auto") return "default";
  return pick;
}

/** CSS palette for Pokazo layouts (cream default; ink/auto = dark editorial). */
export function layoutPalette(raw?: string | null): LayoutPaletteId {
  const pick = sanitizePickerTheme(raw);
  if (pick === "ink-dark") return "ink";
  if (pick === "brand-auto") return "auto";
  return "cream";
}
