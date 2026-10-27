import audienceJson from "./audience.json";
import type { ExampleThumbId } from "./components/ExampleThumb";

/** SEO landings for Wordstat audience clusters — paths are slashless canonicals. */
export type AudienceSlug = "urok" | "doklad" | "shkola" | "studenty" | "biznes";

export type AudienceFaq = { q: string; a: string };

export type AudiencePage = {
  slug: AudienceSlug;
  chip: string;
  /** Unique H1 — must not equal main «Нейросеть для презентаций». */
  h1: string;
  lead: string;
  placeholder: string;
  title: string;
  description: string;
  stepsNote: string;
  scenario: string;
  outlineTitle: string;
  outline: string[];
  examples: { id: ExampleThumbId; title: string }[];
  faq: AudienceFaq[];
};

export const AUDIENCE_PAGES = audienceJson as AudiencePage[];

export function audienceBySlug(slug: string | undefined): AudiencePage | undefined {
  return AUDIENCE_PAGES.find((p) => p.slug === slug);
}

export const AUDIENCE_PATHS = AUDIENCE_PAGES.map((p) => p.slug);

/** Create-flow audience: landing slug, or general when opened from main /app (not school). */
export function sanitizeAudience(raw: string | null | undefined): AudienceSlug | "general" {
  const id = (raw ?? "").trim().toLowerCase();
  return AUDIENCE_PATHS.includes(id as AudienceSlug) ? (id as AudienceSlug) : "general";
}
