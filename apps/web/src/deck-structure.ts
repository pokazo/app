import { apiUrl } from "./api";

export type StructureAccept = {
  deckId: string;
  status: "accepted";
  op: string;
  slide: number;
};

async function structureFetch(
  path: string,
  init: RequestInit,
): Promise<StructureAccept> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = (await res.json().catch(() => null)) as
    | StructureAccept
    | { error?: string }
    | null;
  if (!res.ok) {
    const err = body && "error" in body ? body.error : null;
    throw new Error(err || `structure ${res.status}`);
  }
  return body as StructureAccept;
}

/** Move view-index `from` to absolute view-index `to` (1-based). */
export function moveDeckSlide(deckId: string, from: number, to: number) {
  return structureFetch(`/api/decks/${deckId}/slides/${from}/move`, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

/** Target index for ↑/↓ filmstrip buttons; null when move is not allowed. */
export function thumbMoveTarget(
  from: number,
  direction: "up" | "down",
  last: number,
): number | null {
  if (!Number.isInteger(from) || from < 1 || last < 1) return null;
  if (direction === "up") return from > 1 ? from - 1 : null;
  return from < last ? from + 1 : null;
}

export function deleteDeckSlide(deckId: string, n: number) {
  return structureFetch(`/api/decks/${deckId}/slides/${n}`, { method: "DELETE" });
}

export function insertDeckSlide(deckId: string, after: number) {
  return structureFetch(`/api/decks/${deckId}/slides`, {
    method: "POST",
    body: JSON.stringify({ after }),
  });
}

/** Focus slide after structure job completes (from accepted response). */
export function focusAfterStructure(acceptedSlide: number, maxSlides: number): number {
  return Math.min(maxSlides, Math.max(1, acceptedSlide));
}

export function structureErrorMessage(raw: string): string {
  if (/min slides/i.test(raw)) return "Нельзя удалить — минимум 3 слайда";
  if (/max slides/i.test(raw)) return "Нельзя добавить — максимум 16 слайдов";
  if (/bad move|bad target/i.test(raw)) return "Нельзя сдвинуть этот слайд";
  if (/bad slide/i.test(raw)) return "Нельзя удалить этот слайд";
  if (/busy/i.test(raw)) return "Подождите, идёт сборка";
  if (/unauthorized|401/i.test(raw)) return "Войдите, чтобы править слайды";
  return "Не удалось изменить слайды";
}

export type ThemeAccept = {
  deckId: string;
  status: "accepted";
  theme: string;
};

export async function changeDeckTheme(deckId: string, theme: string): Promise<ThemeAccept> {
  const res = await fetch(apiUrl(`/api/decks/${deckId}/theme`), {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ theme }),
  });
  const body = (await res.json().catch(() => null)) as
    | ThemeAccept
    | { error?: string }
    | null;
  if (!res.ok) {
    const err = body && "error" in body ? body.error : null;
    throw new Error(err || `theme ${res.status}`);
  }
  return body as ThemeAccept;
}

export function themeErrorMessage(raw: string): string {
  if (/bad theme/i.test(raw)) return "Выберите конкретную тему";
  if (/busy/i.test(raw)) return "Подождите, идёт сборка";
  if (/not ready/i.test(raw)) return "Презентация ещё не готова";
  if (/unauthorized|401/i.test(raw)) return "Войдите, чтобы менять тему";
  return "Не удалось сменить тему";
}
