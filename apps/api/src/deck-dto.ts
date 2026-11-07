import { config } from "./env.js";

export type DeckRow = {
  id: string;
  topic: string;
  status: string;
  error: string | null;
  slide_count: number;
  theme?: string | null;
  audience?: string | null;
  billing_kind?: string | null;
  user_id?: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toDeckDto(deck: DeckRow) {
  return {
    deckId: deck.id,
    topic: deck.topic,
    status: deck.status,
    error: deck.error,
    slideCount: Number(deck.slide_count),
    theme: typeof deck.theme === "string" && deck.theme ? deck.theme : "default",
    audience: typeof deck.audience === "string" && deck.audience ? deck.audience : null,
    billingKind: deck.billing_kind ?? null,
    createdAt: iso(deck.created_at),
    updatedAt: iso(deck.updated_at),
    viewUrl:
      deck.status === "ready" || deck.status === "preview"
        ? `${config.appOrigin}/view/${deck.id}`
        : null,
  };
}
