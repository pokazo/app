import audienceJson from "./audience.json";

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
  faq: AudienceFaq[];
  ctaLead: string;
};

export const AUDIENCE_PAGES = audienceJson as AudiencePage[];

export function audienceBySlug(slug: string | undefined): AudiencePage | undefined {
  return AUDIENCE_PAGES.find((p) => p.slug === slug);
}

export const AUDIENCE_PATHS = AUDIENCE_PAGES.map((p) => p.slug);
