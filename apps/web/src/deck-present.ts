/** Auto-hide delay for present chrome overlay (ms). */
export const PRESENT_CHROME_HIDE_MS = 3000;
/** Bottom strip (px) where mouse reveals present chrome. */
export const PRESENT_CHROME_BOTTOM_PX = 120;

/** True when keyboard events should not advance/retreat slides (editing UI). */
export function isTypingTarget(t: EventTarget | null): boolean {
  if (!t || typeof t !== "object") return false;
  const el = t as { tagName?: string; isContentEditable?: boolean };
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(el.isContentEditable);
}

export function shouldAdvanceKey(key: string): boolean {
  return key === " " || key === "Spacebar" || key === "ArrowRight" || key === "PageDown";
}

export function shouldRetreatKey(key: string): boolean {
  return key === "ArrowLeft" || key === "PageUp";
}

/** Reveal chrome when pointer is in the bottom band of the fullscreen host. */
export function isPresentChromeRevealZone(
  clientY: number,
  hostRect: { top: number; height: number },
  bottomPx = PRESENT_CHROME_BOTTOM_PX,
): boolean {
  const bottom = hostRect.top + hostRect.height;
  return clientY >= bottom - bottomPx;
}
