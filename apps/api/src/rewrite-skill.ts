import { layoutCarbonIconHints } from "../slidev-layouts/layout-assert.js";
import type { OutlineSlide } from "./outline.js";
import type { LockedSlideLayout } from "./rewrite-lock.js";

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

function lockedLayoutBlock(locked: LockedSlideLayout | undefined): string {
  if (!locked?.layout) return "";
  const variant = locked.variant ? `, variant=${locked.variant}` : "";
  const image = locked.image ? `, image=${locked.image}` : ", image=(empty)";
  return `
LOCKED layout (нельзя менять): layout=${locked.layout}${variant}${image}
visual в JSON обязан остаться: ${locked.visual}
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
  locked?: LockedSlideLayout;
}): string {
  const lock = opts.locked?.layout
    ? `- visual ОБЯЗАН остаться ровно «${opts.locked.visual}» (layout уже выбран в колоде: ${opts.locked.layout}${opts.locked.variant ? ` / ${opts.locked.variant}` : ""}). Не меняй visual/layout.`
    : opts.isHero
      ? `- Это слайд 1 (hero/cover): visual должен быть hero или cover; нужен imageQuery; points или kicker с текстом.`
      : `- Не делай visual none|default|center|section|intro|end (запрещены «только текст»).`;
  return `Перепиши ОДИН слайд плана презентации (OutlineSlide JSON) по инструкции пользователя.
Остальные слайды колоды не меняй — верни только этот один слайд.
Rewrite меняет только поля внутри текущего layout (тексты, опционально imageQuery) — НЕ смену layout/visual.
${lockedLayoutBlock(opts.locked)}
Тема: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${opts.audience}
Номер слайда: ${opts.slideIndex}
${researchBriefBlock(opts.researchMarkdown)}
Инструкция пользователя:
${opts.instruction.trim()}

Правила:
${lock}
- Непустой heading и полный payload под тот же visual.
- Для image-right|image-left|hero|cover — сохрани imageQuery если картинку не просили менять; для icon — iconHint из allowlist; timeline ≥3 steps; stats ≥2; skills ≥2; cards ≥2; features ровно 3; process ≥3.
- iconHint для icon|features|process — только из: ${LAYOUT_ICON_HINTS}.
- Сохрани полезный контекст предыдущего плана, но выполни инструкцию по полям.
- Не пиши markdown — только JSON одного OutlineSlide.

Предыдущий план этого слайда:
${JSON.stringify(opts.previous)}`;
}

/** Compose/update exactly one existing slide via MCP — same layout, fields only. */
export function composeOneSlideSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You rewrite ONE existing Slidev slide ONLY through tools. Never dump or rewrite the whole slides.md as text.

Tools:
- Slidev MCP: slidev-get-slide, slidev-update-slide ONLY
- User uploads (when present): upload-image-search, upload-image-use
- Yandex Images: yandex-image-search, yandex-image-download
- Unsplash: stock-search, stock-download
- OpenAI image-generate (LAST): when upload/Yandex/Unsplash fail — local /slide-N-gen.png

HARD LOCK — layout:
- Call slidev-get-slide first. Keep the SAME layout: (and variant: for hero) forever.
- Do NOT change layout, do NOT pick a new hero variant, do NOT switch to another layout family.
- Do NOT call hero-list / hero-get / layout-list / layout-get.
- You may only edit fields inside that layout: body text (H1, paragraphs), kicker, brand, source, iconHint, items/steps/stats/cards/features/process, and image: when allowed below.

Photo pipeline (ONLY if user asked to change/replace the image, attached a photo, OR current image: is empty/missing while this layout requires a local image):
  1) If upload tools exist (esp. newly attached rewrite photos): ONE upload-image-search → upload-image-use (filename slide-N.jpg). Prefer the newest / instruction-mentioned upload id.
  2) Else ONE yandex-image-search → prefer suggestedId → yandex-image-download (filename slide-N.jpg)
  3) Else ONE stock-search → stock-download OR image-generate (slide-N-gen.png)
  4) slidev-update-slide keeping the same layout (+ variant) + new image path
If the user only asked for text/field changes, did not attach a photo, and image already exists — do NOT call any image search/download/generate tools.

Do NOT insert, remove, or move slides. Do NOT touch any slide except the target number.
Do NOT change theme/palette in headmatter.

Field rules for the locked layout (keep structure, update values):
- two-cols: H1 ABOVE ::left::, then ::left:: / ::right::; no emoji
- quote | fact | icon | statement: matching fields; icon needs iconHint from allowlist
- cards: frontmatter items: (not cards:); body = H1 only
- timeline: steps in frontmatter; body = H1
- stats: items: (not stats:); body = H1
- skills | features | process: frontmatter items/steps; body = H1
- image-right | image-left | hero: keep layout (+ hero variant); local image: path when updating photo
iconHint allowlist: ${LAYOUT_ICON_HINTS}.
Local image paths only. At most ONE upload-image-search, ONE yandex-image-search and ONE stock-search when photo pipeline runs.

Language: ${lang}.
Picker theme hint: ${theme}.
Finish when the target slide fields match the instruction via slidev-update-slide (same layout).`;
}

export function composeOneSlideUserPrompt(opts: {
  slideIndex: number;
  slide: OutlineSlide;
  locale: string;
  topic: string;
  instruction: string;
  locked?: LockedSlideLayout;
}): string {
  const lock = opts.locked?.layout
    ? `LOCKED: layout=${opts.locked.layout}${opts.locked.variant ? ` variant=${opts.locked.variant}` : ""} currentImage=${opts.locked.image || "(empty)"}
Keep layout${opts.locked.variant ? " and variant" : ""} exactly. Only edit fields (texts / optional image).`
    : `Keep the existing layout of slide ${opts.slideIndex}. Do not change layout.`;
  return `Rewrite ONLY slide ${opts.slideIndex} in place (slidev-get-slide then slidev-update-slide).
Topic: ${opts.topic}
locale=${opts.locale}
User instruction (already reflected in outline; honor it):
${opts.instruction.trim()}

${lock}

Outline slide ${opts.slideIndex} (content fields; visual/layout already locked):
${JSON.stringify(opts.slide)}

Rules:
- Call slidev-get-slide with no=${opts.slideIndex} first, then update that same no=
- Do not change layout${opts.locked?.variant ? " or variant" : ""}
- Do not change any other slide
- Photo tools only if user asked for a new image OR current image is empty/missing for a photo layout
- iconHint allowlist: ${LAYOUT_ICON_HINTS}`;
}

export function composeOneSlideMaxSteps(): number {
  return 12;
}

/** @deprecated use composeOneSlideUserPrompt with locked layout — kept name for call sites. */
export function heroRewriteUserPrompt(opts: {
  slide: OutlineSlide;
  locale: string;
  topic: string;
  deckTitle: string;
  instruction: string;
  locked?: LockedSlideLayout;
}): string {
  return composeOneSlideUserPrompt({
    slideIndex: 1,
    slide: opts.slide,
    locale: opts.locale,
    topic: opts.topic,
    instruction: opts.instruction,
    locked: opts.locked ?? {
      layout: "hero",
      variant: "",
      image: "",
      visual: "hero",
    },
  });
}

export function rewriteRepairPrompt(opts: {
  slideIndex: number;
  error: string;
  md: string;
  locked?: LockedSlideLayout;
}): string {
  const lock = opts.locked?.layout
    ? `Сохрани layout=${opts.locked.layout}${opts.locked.variant ? ` variant=${opts.locked.variant}` : ""}. Не меняй layout/variant.`
    : `Не меняй layout текущего слайда.`;
  return `Сборка Slidev / layout render упала после пересборки слайда ${opts.slideIndex}.
Исправь ТОЛЬКО слайд ${opts.slideIndex} через tools (slidev-get-slide / slidev-update-slide, image tools только если не хватает image).
${lock}
Не трогай другие слайды. Не переписывай весь файл текстом.
Если LayoutError[<layout>] — почини frontmatter/body поля именно слайда ${opts.slideIndex} внутри того же layout.
Ошибка:
${opts.error}
Текущий md (справочно):
${opts.md}`;
}
