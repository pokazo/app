import { layoutCarbonIconHints } from "../slidev-layouts/layout-assert.js";
import type { OutlineSlide } from "./outline.js";

const LAYOUT_ICON_HINTS = layoutCarbonIconHints().join(", ");

function researchBriefBlock(researchMarkdown: string | undefined): string {
  if (!researchMarkdown?.trim()) return "";
  return `
Research brief (обязательный источник фактов; не выдумывай вне него):
---
${researchMarkdown.trim()}
---
В points/stats/source опирайся на brief; URL/название источника → поле source.
`;
}

/** Revise one outline slide from a user instruction (JSON OutlineSlide only). */
export function reviseOutlineSlidePrompt(opts: {
  topic: string;
  locale: string;
  audience: string;
  slideIndex: number;
  previous: OutlineSlide;
  instruction: string;
  researchMarkdown?: string;
  isHero: boolean;
}): string {
  const heroNote = opts.isHero
    ? `- Это слайд 1 (hero/cover): visual должен быть hero или cover; нужен imageQuery; points или kicker с текстом.`
    : `- Не делай visual none|default|center|section|intro|end (запрещены «только текст»).`;
  return `Перепиши ОДИН слайд плана презентации (OutlineSlide JSON) по инструкции пользователя.
Остальные слайды колоды не меняй — верни только этот один слайд.

Тема: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${opts.audience}
Номер слайда: ${opts.slideIndex}
${researchBriefBlock(opts.researchMarkdown)}
Инструкция пользователя:
${opts.instruction.trim()}

Правила:
${heroNote}
- Непустой heading и полный payload под visual.
- Для image-right|image-left|hero|cover — imageQuery; для icon — iconHint из allowlist; timeline ≥3 steps; stats ≥2; skills ≥2; cards ≥2; features ровно 3; process ≥3.
- iconHint для icon|features|process — только из: ${LAYOUT_ICON_HINTS}.
- Сохрани полезный контекст предыдущего плана, но выполни инструкцию.
- Не пиши markdown — только JSON одного OutlineSlide.

Предыдущий план этого слайда:
${JSON.stringify(opts.previous)}`;
}

/** Compose/update exactly one existing slide via MCP (not hero). */
export function composeOneSlideSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You rewrite ONE existing Slidev slide ONLY through tools. Never dump or rewrite the whole slides.md as text.

Tools:
- Slidev MCP: slidev-get-slide, slidev-update-slide ONLY
- Yandex Images (FIRST): yandex-image-search, yandex-image-download
- Unsplash (SECOND): stock-search, stock-download
- OpenAI image-generate (LAST): when Yandex and Unsplash fail — local /slide-N-gen.png

Do NOT insert, remove, or move slides. Do NOT touch any slide except the target number.
Do NOT change theme/palette in headmatter.

Visual / layout mapping (same as deck compose):
- two-cols: H1 ABOVE ::left::, then ::left:: / ::right::; no emoji
- quote | fact | icon | statement: matching layout; icon needs iconHint from allowlist
- cards: frontmatter items: (not cards:); body = H1 only
- timeline: steps in frontmatter; body = H1
- stats: items: (not stats:); body = H1
- skills | features | process: frontmatter items/steps; body = H1
- image-right | image-left: local image: path after photo pipeline
iconHint allowlist: ${LAYOUT_ICON_HINTS}.

Photo pipeline (when visual needs a photo / non-empty imageQuery):
  1) ONE yandex-image-search → prefer suggestedId → yandex-image-download (filename slide-N.jpg)
  2) Else ONE stock-search → stock-download OR image-generate (slide-N-gen.png)
  3) slidev-update-slide with layout + image path
Local paths only. At most ONE yandex-image-search and ONE stock-search.

Language: ${lang}.
Picker theme hint: ${theme}.
Finish when the target slide matches the outline slide via slidev-update-slide.`;
}

export function composeOneSlideUserPrompt(opts: {
  slideIndex: number;
  slide: OutlineSlide;
  locale: string;
  topic: string;
  instruction: string;
}): string {
  return `Rewrite ONLY slide ${opts.slideIndex} in place (slidev-get-slide then slidev-update-slide).
Topic: ${opts.topic}
locale=${opts.locale}
User instruction (already reflected in outline; honor it):
${opts.instruction.trim()}

Outline slide ${opts.slideIndex}:
${JSON.stringify(opts.slide)}

Rules:
- Call slidev-get-slide with no=${opts.slideIndex} first if helpful, then update that same no=
- Do not change any other slide
- Photo slides: ONE yandex then stock/generate if needed; image: /slide-${opts.slideIndex}.jpg or /slide-${opts.slideIndex}-gen.png
- iconHint allowlist: ${LAYOUT_ICON_HINTS}`;
}

export function composeOneSlideMaxSteps(): number {
  return 16;
}

export function heroRewriteUserPrompt(opts: {
  slide: OutlineSlide;
  locale: string;
  topic: string;
  deckTitle: string;
  instruction: string;
}): string {
  return `Recompose the hero (slide 1 only) for this deck after a user rewrite request.
Topic: ${opts.topic}
Deck title: ${opts.deckTitle}
locale=${opts.locale}
User instruction:
${opts.instruction.trim()}

Outline slide 1 (content source; YOU choose variant via hero-list / hero-get):
${JSON.stringify(opts.slide)}

Rules:
- FIRST call hero-list, then pick exactly one variant: ribbon | corner | inset | fullbleed | editorial | product
- Never use split / interactive / centered / image-right / image-left for the hero
- ONE yandex-image-search → prefer suggestedId → yandex-image-download; only then stock/image-generate → slidev-update-slide
- Body: H1 + 1–2 sentences, no bullets
- Leave all other slides untouched`;
}

export function rewriteRepairPrompt(opts: {
  slideIndex: number;
  error: string;
  md: string;
}): string {
  return `Сборка Slidev / layout render упала после пересборки слайда ${opts.slideIndex}.
Исправь ТОЛЬКО слайд ${opts.slideIndex} через tools (slidev-get-slide / slidev-update-slide, image tools при необходимости).
Не трогай другие слайды. Не переписывай весь файл текстом.
Если LayoutError[<layout>] — почини frontmatter/body именно слайда ${opts.slideIndex}.
Ошибка:
${opts.error}
Текущий md (справочно):
${opts.md}`;
}
