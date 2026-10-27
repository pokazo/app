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

type FullscreenCapable = HTMLElement & {
  webkitRequestFullscreen?: () => void | Promise<void>;
  webkitRequestFullScreen?: () => void | Promise<void>;
};

/** Request element fullscreen (standard + webkit). Returns false if unavailable/denied. */
export async function requestElementFullscreen(el: HTMLElement | null): Promise<boolean> {
  if (!el) return false;
  const node = el as FullscreenCapable;
  try {
    if (typeof node.requestFullscreen === "function") {
      await node.requestFullscreen();
      return true;
    }
    if (typeof node.webkitRequestFullscreen === "function") {
      await Promise.resolve(node.webkitRequestFullscreen());
      return true;
    }
    if (typeof node.webkitRequestFullScreen === "function") {
      await Promise.resolve(node.webkitRequestFullScreen());
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function currentFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}
