import type { OutlineT } from "./outline.js";

export const HERO_VARIANTS = ["centered", "fullbleed", "editorial", "product"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

export function heroSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You compose ONLY the first Slidev slide (hero/cover). Never dump or rewrite the whole slides.md as text.

Tools:
- Slidev MCP: slidev-update-slide only (slide 1 already exists as scaffold)
- Yandex Images (FIRST): yandex-image-search, yandex-image-download. Prefer natural Russian query. Judge title/domain/pageUrl (title may be synthesized from URL — still valid).
- Unsplash (SECOND): stock-search, stock-download. English query. Judge description/altDescription.
- OpenAI image-generate (LAST, cheap gpt-image-1-mini, low quality): when Yandex and Unsplash are empty OR wrong subject. Writes local /slide-1-gen.png.

Do NOT insert, remove, or move slides. Do NOT create slide 2+. Only update slide 1 in place.
Do NOT call slidev-get-info, slidev-list-slides, or slidev-get-slide — outline + topic are enough; go straight to photo then update.

Hero variants (pick ONE; never use split or interactive):
- centered — text centered on an opaque plate over the photo (never letters-on-letters if the image has baked-in type); brand/kicker centered; H1 + 1 short sentence.
- fullbleed — photo fills the frame; text over a dark gradient at the bottom-left; cinematic.
- editorial — asymmetric magazine look: large type on the left pane, photo cropped on the right (not 50/50 split).
- product — large product/scene photo on top, short promise band below (H1 + one line).

How to choose:
- Brand / manifesto / personal intro → centered or editorial
- If the chosen photo already has big logos/slogans/type → prefer editorial or product (never centered over text-heavy art)
- Atmosphere, place, story, drama → fullbleed
- Concrete product, vehicle, device, UI, named object → product
- Pick the strongest match for the outline intent; vary intentionally — do not default to the same variant every time.

Frontmatter for slide 1:
  layout: hero
  variant: centered|fullbleed|editorial|product
  image: /slide-1.jpg or /slide-1-gen.png
  kicker: SHORT UPPERCASE LABEL (optional but preferred)
  brand: short brand/name (optional)
  source: only if citing a fact (usually "")

Body: H1 + 1–2 sentences (or one short paragraph). No bullet lists. No emoji.

Photo pipeline (one photo for slide 1):
  1) ONE yandex-image-search (Russian/natural query from imageQuery when locale is Russian; orientation horizontal)
  2) If suggestedId or any hit looks on-topic by domain/pageUrl/title → IMMEDIATELY yandex-image-download (id, filename slide-1.jpg). Empty title is NOT a reason to skip.
  3) Only if Yandex empty/all-wrong/error → ONE stock-search (English, landscape) → stock-download OR image-generate
  4) slidev-update-slide with layout hero + variant + image path
Local paths only — never http(s) image URLs. Never high/expensive image quality.
Do NOT call yandex-image-search more than once. Do NOT skip yandex-image-download just because title looks short.

theme/palette are already set — do not change theme or palette.
Language: ${lang}.
Picker theme hint (do not rewrite frontmatter theme): ${theme}.
Finish when slide 1 has layout: hero, a valid variant, a local image: path, and a strong H1.`;
}

export function heroUserPrompt(opts: {
  outline: OutlineT;
  locale: string;
  topic: string;
}): string {
  const first = opts.outline.slides[0];
  return `Compose the hero (slide 1 only) for this deck.
Topic: ${opts.topic}
Deck title: ${opts.outline.title}
locale=${opts.locale}

First outline slide (content source; YOU choose variant):
${JSON.stringify(first ?? null)}

Rules:
- Choose exactly one variant: centered | fullbleed | editorial | product (required — missing/invalid variant throws LayoutError[hero])
- Never use split / interactive / image-right / image-left for the hero
- ONE yandex-image-search → prefer suggestedId → yandex-image-download; only then stock/image-generate → slidev-update-slide
- Body: H1 + 1–2 sentences, no bullets
- Leave all other slides untouched`;
}

export function heroMaxSteps(): number {
  return 10;
}
