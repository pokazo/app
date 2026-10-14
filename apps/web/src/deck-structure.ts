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

export function moveDeckSlide(deckId: string, n: number, direction: "up" | "down") {
  return structureFetch(`/api/decks/${deckId}/slides/${n}/move`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
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
  if (/bad move/i.test(raw)) return "Нельзя сдвинуть этот слайд";
  if (/busy/i.test(raw)) return "Подождите, идёт сборка";
  if (/unauthorized|401/i.test(raw)) return "Войдите, чтобы править слайды";
  return "Не удалось изменить слайды";
}
