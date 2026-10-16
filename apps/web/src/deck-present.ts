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
