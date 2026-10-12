/** Source-of-truth for hero variant selection (hero MCP only — not outline/compose). */

import { HERO_VARIANTS, type HeroVariant } from "./hero-skill.js";

/** One frontmatter or body field the hero block accepts. */
export type HeroFieldSpec = {
  name: string;
  required: boolean;
  /** Where the model sets it */
  in: "frontmatter" | "body";
  /** Short type hint for the agent */
  type: string;
  /** What the layout reads / validates */
  expects: string;
  /** Soft limit the agent should respect (overflow clips) */
  limit?: string;
};

export type HeroCatalogEntry = {
  id: HeroVariant;
  summary: string;
  whenToUse: string;
  antiPatterns: string;
  /** What the model must know/have before committing to this variant. */
  needs: string[];
  /** Exact fields the hero Vue block reads — call hero-get before slidev-update-slide. */
  fields: HeroFieldSpec[];
  frontmatter: string;
  body: string;
  displays: string;
};

/** Shared fields every hero variant accepts (same Vue props + slot). */
const SHARED_FIELDS: HeroFieldSpec[] = [
  {
    name: "layout",
    required: true,
    in: "frontmatter",
    type: '"hero"',
    expects: 'Must be exactly "hero"',
  },
  {
    name: "variant",
    required: true,
    in: "frontmatter",
    type: "ribbon|corner|inset|fullbleed|product",
    expects: "Exactly one catalog id; split|interactive|centered|editorial throw LayoutError[hero]",
  },
  {
    name: "image",
    required: true,
    in: "frontmatter",
    type: "local path",
    expects: "Local path only (/slide-1.jpg or /slide-1-gen.png). Never http(s). Assert requires it for all photo variants; always set it for hero-compose.",
  },
  {
    name: "brand",
    required: false,
    in: "frontmatter",
    type: "string",
    expects: "Short brand/name shown with mark (top of type area)",
    limit: "1–3 words",
  },
  {
    name: "kicker",
    required: false,
    in: "frontmatter",
    type: "string",
    expects: "Uppercase label above H1 (preferred)",
    limit: "2–5 words, ALL CAPS",
  },
  {
    name: "source",
    required: false,
    in: "frontmatter",
    type: "string",
    expects: "Citation only when stating a fact; usually omit or empty",
  },
  {
    name: "palette",
    required: false,
    in: "frontmatter",
    type: "cream|ink|auto",
    expects: "Already set by pipeline — do NOT change in hero-compose",
  },
  {
    name: "H1",
    required: true,
    in: "body",
    type: "markdown # heading",
    expects: "Single H1 as first body line — the cover title",
    limit: "≈2–8 words; longer titles clip (overflow:hidden)",
  },
  {
    name: "promise",
    required: true,
    in: "body",
    type: "1–2 sentences",
    expects: "One short paragraph under H1. No bullet lists. No emoji.",
    limit: "1–2 sentences",
  },
];

function fieldsFor(variant: HeroVariant, imageNote: string, h1Limit: string): HeroFieldSpec[] {
  return SHARED_FIELDS.map((f) => {
    if (f.name === "variant") {
      return { ...f, type: variant, expects: `Must be "${variant}" for this contract` };
    }
    if (f.name === "image") {
      return { ...f, expects: imageNote };
    }
    if (f.name === "H1") {
      return { ...f, limit: h1Limit };
    }
    return { ...f };
  });
}

export const HERO_CATALOG: HeroCatalogEntry[] = [
  {
    id: "ribbon",
    summary: "Full-bleed photo with a horizontal paper band carrying the title",
    whenToUse:
      "Brand / manifesto / personal intro when the photo should stay dominant but type needs a clean reading surface",
    antiPatterns:
      "Busy lower-third of the photo (faces/logos sit under the band); tiny H1; mid-deck content",
    needs: [
      "Strong landscape photo (local image path)",
      "Short H1 (≈2–6 words)",
      "One promise sentence",
      "Optional brand + uppercase kicker",
    ],
    fields: fieldsFor(
      "ribbon",
      "REQUIRED local path — photo fills frame behind the paper ribbon",
      "≈2–6 words (fits the ribbon)",
    ),
    frontmatter: "layout: hero; variant: ribbon; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Photo full frame; brand top-left; paper ribbon with kicker + H1 + promise across lower third",
  },
  {
    id: "corner",
    summary: "Full-bleed photo; compact type anchored bottom-right",
    whenToUse: "Atmosphere, place, story, drama — photo is the hero; type is a caption",
    antiPatterns:
      "Photo with busy bottom-right corner; long multi-line H1; text-heavy baked-in slogans in that corner",
    needs: [
      "Strong landscape photo with open/quiet bottom-right",
      "Very short H1",
      "One promise line",
      "Optional brand (top-left) + kicker",
    ],
    fields: fieldsFor(
      "corner",
      "REQUIRED local path — full-bleed photo; keep bottom-right quiet for type",
      "≈2–5 words (caption-sized)",
    ),
    frontmatter: "layout: hero; variant: corner; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Photo full frame; brand top-left; kicker + H1 + promise bottom-right (no card)",
  },
  {
    id: "inset",
    summary: "Paper field with left type and a framed photo inset on the right",
    whenToUse:
      "Brand / thesis when photo is supporting, not cinematic; or when photo has baked-in type/logos",
    antiPatterns: "Needing edge-to-edge atmosphere; product that must fill the frame (use product)",
    needs: [
      "Local photo suitable as a framed inset (not required to be cinematic)",
      "Clear H1 + promise that stand alone on paper",
      "Optional brand + kicker",
    ],
    fields: fieldsFor(
      "inset",
      "REQUIRED local path — shown as framed inset on the right",
      "≈2–8 words",
    ),
    frontmatter: "layout: hero; variant: inset; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Cream/paper left: brand, kicker, H1, promise; framed photo window on the right",
  },
  {
    id: "fullbleed",
    summary: "Cinematic photo with bottom-left type over a dark gradient",
    whenToUse: "Atmosphere, place, story, drama — immersive cover",
    antiPatterns:
      "Photo already covered in large type; product packshot that needs a clean band (use product)",
    needs: [
      "Dramatic landscape photo",
      "Short H1 readable on dark gradient",
      "One promise line",
      "Optional brand + kicker",
    ],
    fields: fieldsFor(
      "fullbleed",
      "REQUIRED local path — cinematic full frame under dark bottom gradient",
      "≈2–6 words",
    ),
    frontmatter: "layout: hero; variant: fullbleed; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Photo full frame; dark bottom gradient; brand top; type bottom-left",
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
    fields: fieldsFor(
      "product",
      "REQUIRED local path — product/object stage on the TOP half",
      "≈2–6 words (must fit the bottom paper band — long H1 clips)",
    ),
    frontmatter: "layout: hero; variant: product; image: /local.png; brand?; kicker?",
    body: "H1 + 1 short sentence",
    displays: "Photo stage on top; paper band below with brand, kicker, H1, promise",
  },
];

const BY_ID = new Map(HERO_CATALOG.map((e) => [e.id, e]));

export type HeroListRow = Pick<
  HeroCatalogEntry,
  "id" | "summary" | "whenToUse" | "needs" | "fields"
>;

export function heroList(): HeroListRow[] {
  return HERO_CATALOG.map(({ id, summary, whenToUse, needs, fields }) => ({
    id,
    summary,
    whenToUse,
    needs,
    fields,
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
