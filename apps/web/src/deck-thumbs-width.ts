/** Default filmstrip width in the desktop deck view (px). */
export const DECK_THUMBS_WIDTH_DEFAULT = 200;
/** Narrowest filmstrip that still fits slide actions (px). */
export const DECK_THUMBS_WIDTH_MIN = 140;
/** Widest filmstrip before the stage is squeezed on a normal desktop (px). */
export const DECK_THUMBS_WIDTH_MAX = 720;
/** Stage keeps at least this much of the layout while the filmstrip grows (px). */
export const DECK_STAGE_MIN_PX = 360;

const STORAGE_KEY = "pokazo.deckThumbsWidth";

export type DeckThumbsWidthStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** Clamp a dragged filmstrip width. `layoutWidth` keeps the stage usable. */
export function clampDeckThumbsWidth(px: number, layoutWidth?: number): number {
  let max = DECK_THUMBS_WIDTH_MAX;
  if (layoutWidth != null && Number.isFinite(layoutWidth) && layoutWidth > 0) {
    max = Math.min(max, Math.max(DECK_THUMBS_WIDTH_MIN, layoutWidth - DECK_STAGE_MIN_PX));
  }
  if (!Number.isFinite(px)) return DECK_THUMBS_WIDTH_DEFAULT;
  return Math.round(Math.min(max, Math.max(DECK_THUMBS_WIDTH_MIN, px)));
}

export function readDeckThumbsWidth(storage: DeckThumbsWidthStorage | null | undefined): number {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return DECK_THUMBS_WIDTH_DEFAULT;
    return clampDeckThumbsWidth(Number(raw));
  } catch {
    return DECK_THUMBS_WIDTH_DEFAULT;
  }
}

export function writeDeckThumbsWidth(
  px: number,
  storage: DeckThumbsWidthStorage | null | undefined,
): void {
  try {
    storage?.setItem(STORAGE_KEY, String(clampDeckThumbsWidth(px)));
  } catch {
    /* private mode / blocked storage */
  }
}
