export const SLIDEV_THEME_IDS = ["default", "seriph", "apple-basic", "bricks", "shibainu"] as const;
export const PICKER_THEME_IDS = ["auto", ...SLIDEV_THEME_IDS] as const;

export type PickerThemeId = (typeof PICKER_THEME_IDS)[number];
export type SlidevThemeId = (typeof SLIDEV_THEME_IDS)[number];

export function sanitizePickerTheme(raw?: string | null): PickerThemeId {
  const id = (raw ?? "").trim();
  return (PICKER_THEME_IDS as readonly string[]).includes(id) ? (id as PickerThemeId) : "auto";
}

export function slidevThemeId(raw?: string | null): SlidevThemeId {
  const pick = sanitizePickerTheme(raw);
  if (pick === "auto") return "default";
  return pick;
}
