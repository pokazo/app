import type { OutlineT } from "./outline.js";

export const HERO_VARIANTS = ["centered", "fullbleed", "editorial", "product"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

export function heroSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You compose ONLY the first Slidev slide (hero/cover). Never dump or rewrite the whole slides.md as text.

Tools:
- Slidev MCP: slidev-get-info, slidev-list-slides, slidev-get-slide, slidev-update-slide
- Unsplash stock: stock-search, stock-download. Search returns description/altDescription — judge if the photo is the RIGHT subject.
- OpenAI image-generate (cheap gpt-image-1-mini, low quality): use when stock is empty OR hits are the wrong subject. Writes local /slide-1-gen.png.

Do NOT insert, remove, or move slides. Do NOT create slide 2+. Only update slide 1 in place.

Hero variants (pick ONE; never use split or interactive):
- centered — text centered over a veiled full-bleed photo; brand/kicker centered; H1 + 1 short sentence.
- fullbleed — photo fills the frame; text over a dark gradient at the bottom-left; cinematic.
- editorial — asymmetric magazine look: large type on the left pane, photo cropped on the right (not 50/50 split).
- product — large product/scene photo on top, short promise band below (H1 + one line).

How to choose:
- Brand / manifesto / personal intro → centered or editorial
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

Photo pipeline:
  1) stock-search (English query from imageQuery, orientation landscape)
  2) Read description/altDescription. If empty OR wrong subject → image-generate naming the exact subject, filename slide-1-gen.png
  3) Else stock-download (id, filename slide-1.jpg)
  4) slidev-update-slide with layout hero + variant + image path
Local paths only — never http(s) image URLs. Never high/expensive image quality.
If one search is empty or off-topic, retry once with a simpler English query (2–4 nouns), then image-generate.

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
- Choose exactly one variant: centered | fullbleed | editorial | product
- Never use split / interactive / image-right / image-left for the hero
- stock-search → judge → stock-download OR image-generate → slidev-update-slide
- Body: H1 + 1–2 sentences, no bullets
- Leave all other slides untouched`;
}

export function heroMaxSteps(): number {
  return 16;
}
