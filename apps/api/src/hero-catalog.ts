/** Source-of-truth for hero variant selection (hero MCP only — not outline/compose). */

import { HERO_VARIANTS, type HeroVariant } from "./hero-skill.js";

export type HeroCatalogEntry = {
  id: HeroVariant;
  summary: string;
  whenToUse: string;
  antiPatterns: string;
  /** What the model must know/have before committing to this variant. */
  needs: string[];
  frontmatter: string;
  body: string;
  displays: string;
};

export const HERO_CATALOG: HeroCatalogEntry[] = [
  {
    id: "ribbon",
    summary: "Full-bleed photo with a horizontal paper band carrying the title",
    whenToUse: "Brand / manifesto / personal intro when the photo should stay dominant but type needs a clean reading surface",
    antiPatterns: "Busy lower-third of the photo (faces/logos sit under the band); tiny H1; mid-deck content",
    needs: [
      "Strong landscape photo (local image path)",
      "Short H1 (≈2–6 words)",
      "One promise sentence",
      "Optional brand + uppercase kicker",
    ],
    frontmatter: "layout: hero; variant: ribbon; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Photo full frame; brand top-left; paper ribbon with kicker + H1 + promise across lower third",
  },
  {
    id: "corner",
    summary: "Full-bleed photo; compact type anchored bottom-right",
    whenToUse: "Atmosphere, place, story, drama — photo is the hero; type is a caption",
    antiPatterns: "Photo with busy bottom-right corner; long multi-line H1; text-heavy baked-in slogans in that corner",
    needs: [
      "Strong landscape photo with open/quiet bottom-right",
      "Very short H1",
      "One promise line",
      "Optional brand (top-left) + kicker",
    ],
    frontmatter: "layout: hero; variant: corner; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Photo full frame; brand top-left; kicker + H1 + promise bottom-right (no card)",
  },
  {
    id: "inset",
    summary: "Paper field with left type and a framed photo inset on the right",
    whenToUse: "Brand / thesis when photo is supporting, not cinematic; or when photo has baked-in type/logos",
    antiPatterns: "Needing edge-to-edge atmosphere; product that must fill the frame (use product)",
    needs: [
      "Local photo suitable as a framed inset (not required to be cinematic)",
      "Clear H1 + promise that stand alone on paper",
      "Optional brand + kicker",
    ],
    frontmatter: "layout: hero; variant: inset; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Cream/paper left: brand, kicker, H1, promise; framed photo window on the right",
  },
  {
    id: "fullbleed",
    summary: "Cinematic photo with bottom-left type over a dark gradient",
    whenToUse: "Atmosphere, place, story, drama — immersive cover",
    antiPatterns: "Photo already covered in large type; product packshot that needs a clean band (use product)",
    needs: [
      "Dramatic landscape photo",
      "Short H1 readable on dark gradient",
      "One promise line",
      "Optional brand + kicker",
    ],
    frontmatter: "layout: hero; variant: fullbleed; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Photo full frame; dark bottom gradient; brand top; type bottom-left",
  },
  {
    id: "editorial",
    summary: "Asymmetric magazine: type pane left, photo crop right",
    whenToUse: "Brand / manifesto / personal intro with editorial energy; photo may have baked-in type",
    antiPatterns: "50/50 split layouts; needing the whole photo uncropped",
    needs: [
      "Photo that crops well on the right (portrait subject or texture OK)",
      "H1 that can run a bit longer than cinematic variants",
      "One supporting sentence",
      "Optional brand + kicker",
    ],
    frontmatter: "layout: hero; variant: editorial; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Solid type pane ~left half; diagonally cropped photo on the right",
  },
  {
    id: "product",
    summary: "Large product/scene stage on top; short promise band below",
    whenToUse: "Concrete product, vehicle, device, UI, named object — object is the visual",
    antiPatterns: "Abstract mood with no clear object; long essay under the photo",
    needs: [
      "Clear product/object photo (local path)",
      "Short H1 naming the promise/object",
      "One supporting line",
      "Optional brand + kicker",
    ],
    frontmatter: "layout: hero; variant: product; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Photo stage on top; paper band below with brand, kicker, H1, promise",
  },
];

const BY_ID = new Map(HERO_CATALOG.map((e) => [e.id, e]));

export type HeroListRow = Pick<
  HeroCatalogEntry,
  "id" | "summary" | "whenToUse" | "needs"
>;

export function heroList(): HeroListRow[] {
  return HERO_CATALOG.map(({ id, summary, whenToUse, needs }) => ({
    id,
    summary,
    whenToUse,
    needs,
  }));
}

export function heroGet(id: string): HeroCatalogEntry {
  const key = id.trim() as HeroVariant;
  const entry = BY_ID.get(key);
  if (!entry) {
    throw new Error(
      `Unknown hero variant ${JSON.stringify(id)}; expected one of ${HERO_VARIANTS.join("|")}`,
    );
  }
  return entry;
}

/** Catalog completeness guard — every HERO_VARIANTS id has exactly one entry. */
export function assertHeroCatalogComplete(): void {
  const ids = HERO_CATALOG.map((e) => e.id);
  if (ids.length !== HERO_VARIANTS.length || new Set(ids).size !== ids.length) {
    throw new Error("HERO_CATALOG must list each HERO_VARIANTS id exactly once");
  }
  for (const v of HERO_VARIANTS) {
    if (!BY_ID.has(v)) throw new Error(`HERO_CATALOG missing variant ${v}`);
  }
}
