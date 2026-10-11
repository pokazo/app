import type { OutlineT } from "./outline.js";

export const HERO_VARIANTS = [
  "ribbon",
  "corner",
  "inset",
  "fullbleed",
  "editorial",
  "product",
] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

export function heroSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You compose ONLY the first Slidev slide (hero/cover). Never dump or rewrite the whole slides.md as text.

Tools:
- Hero MCP (variant catalog — THIS PHASE ONLY): hero-list, hero-get. Call hero-list BEFORE choosing a variant; call hero-get on 1–2 finalists if needs are unclear.
- Slidev MCP: slidev-update-slide only (slide 1 already exists as scaffold)
- User uploads (FIRST when present): upload-image-search, upload-image-use. Prefer originalName over vague caption. If suggestedId is set → IMMEDIATELY upload-image-use BEFORE yandex/stock. Do not reject uploads for "solid/abstract" captions.
- Yandex Images (SECOND): yandex-image-search, yandex-image-download. Prefer natural Russian query. Judge title/domain/pageUrl (title may be synthesized from URL — still valid).
- Unsplash (THIRD): stock-search, stock-download. English query. Judge description/altDescription.
- OpenAI image-generate (LAST, cheap gpt-image-1-mini, low quality): when upload/Yandex/Unsplash are empty OR wrong subject. Writes local /slide-1-gen.png.

Do NOT insert, remove, or move slides. Do NOT create slide 2+. Only update slide 1 in place.
Do NOT call slidev-get-info, slidev-list-slides, or slidev-get-slide — outline + topic are enough.

Variant decision (required):
1) Call hero-list (pass _="") and read summary / whenToUse / needs for each variant.
2) Optionally hero-get(id) for a shortlist when still unsure.
3) Pick ONE id from: ribbon | corner | inset | fullbleed | editorial | product
4) Never use split, interactive, or centered.
5) Vary intentionally across decks — do not default to the same variant every time.
6) Only after the variant is chosen, run the photo pipeline, then slidev-update-slide.

Frontmatter for slide 1:
  layout: hero
  variant: <chosen id>
  image: /slide-1.jpg or /slide-1-gen.png
  kicker: SHORT UPPERCASE LABEL (optional but preferred)
  brand: short brand/name (optional)
  source: only if citing a fact (usually "")

Body: H1 + 1–2 sentences (or one short paragraph). No bullet lists. No emoji.

Photo pipeline (one photo for slide 1):
  1) If upload tools exist: ONE upload-image-search (not only list). If suggestedId → IMMEDIATELY upload-image-use (filename slide-1.jpg). Else use the hit with the best originalName match. Never go to Yandex while a usable upload hit exists.
  2) Only if uploads empty/error → ONE yandex-image-search (Russian/natural query; orientation horizontal)
  3) If suggestedId or any hit looks on-topic by domain/pageUrl/title → IMMEDIATELY yandex-image-download (id, filename slide-1.jpg). Empty title is NOT a reason to skip.
  4) Only if Yandex empty/all-wrong/error → ONE stock-search (English, landscape) → stock-download OR image-generate
  5) slidev-update-slide with layout hero + chosen variant + image path
Local paths only — never http(s) image URLs. Never high/expensive image quality.
Do NOT call upload-image-search or yandex-image-search more than once each. Do NOT skip download/use just because title looks short.

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

First outline slide (content source; YOU choose variant via hero-list / hero-get):
${JSON.stringify(first ?? null)}

Rules:
- FIRST call hero-list, then pick exactly one variant: ribbon | corner | inset | fullbleed | editorial | product (required — missing/invalid variant throws LayoutError[hero])
- Never use split / interactive / centered / image-right / image-left for the hero
- Match outline intent to variant needs from the catalog before searching photos
- ONE yandex-image-search → prefer suggestedId → yandex-image-download; only then stock/image-generate → slidev-update-slide
- Body: H1 + 1–2 sentences, no bullets
- Leave all other slides untouched`;
}

export function heroMaxSteps(): number {
  return 12;
}
