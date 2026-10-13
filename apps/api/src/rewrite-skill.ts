import { layoutCarbonIconHints } from "../slidev-layouts/layout-assert.js";
import { audienceForPrompt } from "./audience.js";
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

function currentLayoutHint(locked: LockedSlideLayout | undefined): string {
  if (!locked?.layout) return "";
  const variant = locked.variant ? `, variant=${locked.variant}` : "";
  const image = locked.image ? `, image=${locked.image}` : ", image=(empty)";
  return `
Текущий layout в колоде (starting point): layout=${locked.layout}${variant}${image}
visual сейчас: ${locked.visual}
`;
}

/**
 * Vague «переделай всё / не нравится» without naming a field → treat as hard refresh
 * (new layout/visual + new photo + substantially new copy).
 */
export function isFullRedoInstruction(instruction: string): boolean {
  const t = instruction.trim().toLowerCase().replace(/\s+/g, " ");
  if (t.length < 2) return false;
  if (
    /полностью\s+передел|переделай\s+(вс[её]|все|заново|слайд)|вс[её]\s+(заново|по[- ]?другому)|с\s+нуля|заново\s+(сделай|передел)|пересобери|сделай\s+по[- ]?другому/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/не\s+нравит/i.test(t)) {
    return !/заголов|текст|картинк|фото|фон|макет|layout|цифр|список|kicker|буллет|пункт/i.test(
      t,
    );
  }
  return false;
}

/** Revise one outline slide from a user instruction (JSON OutlineSlide only). Body: visual may change. */
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
  const fullRedo = isFullRedoInstruction(opts.instruction);
  const currentVisual = opts.locked?.visual || opts.previous.visual;
  const lock = opts.isHero
    ? fullRedo
      ? `- Это hero/cover FULL REDO: visual ОБЯЗАН остаться hero или cover. Существенно перепиши heading/intent и imageQuery — не парафраз. Не уводи в image-right|timeline|stats.`
      : `- Это hero/cover: visual ОБЯЗАН остаться hero или cover. Не уводи в image-right|timeline|stats и т.п.`
    : fullRedo
      ? `- FULL REDO: пользователь хочет ДРУГОЙ слайд. Выбери ДРУГОЙ visual (не «${currentVisual}»). Существенно перепиши heading/points/intent — не парафраз предыдущего. Для photo-layouts обнови imageQuery под новый ракурс/сюжет. Нельзя вернуть почти тот же текст и тот же visual.`
      : `- По умолчанию сохрани visual=${currentVisual} (layout ${opts.locked?.layout || "текущий"}).
- Меняй visual/layout ТОЛЬКО если инструкция явно просит другой макет/visual ИЛИ контент не лезет в текущий layout.
- Не делай visual none|default|center|section|intro|end (запрещены «только текст»).`;
  return `Перепиши ОДИН слайд плана презентации (OutlineSlide JSON) по инструкции пользователя.
Остальные слайды колоды не меняй — верни только этот один слайд.
${currentLayoutHint(opts.locked)}
Тема: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${audienceForPrompt(opts.audience)}
Номер слайда: ${opts.slideIndex}
${researchBriefBlock(opts.researchMarkdown)}
Инструкция пользователя:
${opts.instruction.trim()}

Правила:
${lock}
- Непустой heading и полный payload под выбранный visual.
- Для image-right|image-left|hero|cover — обнови imageQuery если просили сменить картинку${fullRedo ? " или это FULL REDO" : ""}; иначе сохрани; для icon — iconHint из allowlist; timeline ≥3 steps; stats ≥2; skills ≥2; cards ≥2; features ровно 3; process ≥3.
- iconHint для icon|features|process — только из: ${LAYOUT_ICON_HINTS}.
- Сохрани полезный контекст предыдущего плана, но выполни инструкцию.
- Не пиши markdown — только JSON одного OutlineSlide.

Предыдущий план этого слайда:
${JSON.stringify(opts.previous)}`;
}

/** Body-slide rewrite via MCP — layout catalog + fields/images (NOT hero). */
export function composeOneSlideSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You rewrite ONE existing Slidev BODY slide ONLY through tools. Never dump or rewrite the whole slides.md as text.
This is NOT the hero flow — do NOT call hero-list or hero-get.

Tools:
- Slidev MCP: slidev-get-slide, slidev-update-slide ONLY (no insert/remove/move)
- Layout MCP: layout-list, layout-match, layout-get
- User uploads (when present): upload-image-list, upload-image-search, upload-image-use
- Yandex Images: yandex-image-search, yandex-image-download
- Unsplash: stock-search, stock-download
- OpenAI image-generate (LAST): when upload/Yandex/Unsplash fail or wrong subject — local /slide-N-gen.png

Layout (soft lock, unless FULL REDO — see user prompt):
- Call slidev-get-slide first.
- DEFAULT: keep the SAME layout; only edit fields (H1, bullets, kicker, brand, source, iconHint, items/steps/stats/cards/features/process, optional image:).
- CHANGE layout if the user asked for a different layout/visual, content cannot fit, OR the user prompt says FULL REDO MODE:
  1) layout-match and/or layout-get on the chosen id (FULL REDO: pick a DIFFERENT body layout than current)
  2) ONE slidev-update-slide with the new layout + required fields from that contract
- Never switch this body slide to layout: hero or cover (hero has a separate rewrite flow).

Photo pipeline (if user asked to change/replace the image, attached a photo, current image: is empty/missing while this layout requires a local image, OR FULL REDO MODE):
  1) If upload tools exist (esp. newly attached rewrite photos): ONE upload-image-search → upload-image-use (filename slide-N.jpg). Prefer the newest / instruction-mentioned upload id.
  2) Else ONE yandex-image-search (natural Russian query naming the exact subject) → prefer suggestedId → yandex-image-download (filename slide-N.jpg). Judge title/domain/pageUrl; if wrong subject → stock or image-generate.
  3) Else ONE stock-search → stock-download OR image-generate (slide-N-gen.png)
  4) slidev-update-slide with local image: path
If the user only asked for text/field changes (not FULL REDO), did not attach a photo, and image already exists — do NOT call any image search/download/generate tools.

Do NOT insert, remove, or move slides. Do NOT touch any slide except the target number.
Do NOT change theme/palette in headmatter.

Field rules (match chosen layout contract):
- two-cols: H1 ABOVE ::left::, then ::left:: / ::right::; no emoji
- quote | fact | icon | statement: matching fields; icon needs iconHint from allowlist
- cards: frontmatter items: (not cards:); body = H1 only
- timeline: steps in frontmatter; body = H1
- stats: items: (not stats:); body = H1
- skills | features | process: frontmatter items/steps; body = H1
- image-right | image-left: local image: path when updating photo
iconHint allowlist: ${LAYOUT_ICON_HINTS}.
Local image paths only. At most ONE upload-image-search, ONE yandex-image-search and ONE stock-search when photo pipeline runs.

Language: ${lang}.
Picker theme hint: ${theme}.
Finish when the target slide matches the instruction via slidev-update-slide.`;
}

export function composeOneSlideUserPrompt(opts: {
  slideIndex: number;
  slide: OutlineSlide;
  locale: string;
  topic: string;
  instruction: string;
  locked?: LockedSlideLayout;
}): string {
  const fullRedo = isFullRedoInstruction(opts.instruction);
  const current = opts.locked?.layout
    ? fullRedo
      ? `CURRENT: layout=${opts.locked.layout}${opts.locked.variant ? ` variant=${opts.locked.variant}` : ""} currentImage=${opts.locked.image || "(empty)"}
FULL REDO MODE: MUST switch to a different body layout than ${opts.locked.layout} (layout-match → layout-get → slidev-update-slide). MUST run the photo pipeline for a fresh local image. Content must look clearly different — not a paraphrase. Never use hero/cover.`
      : `CURRENT: layout=${opts.locked.layout}${opts.locked.variant ? ` variant=${opts.locked.variant}` : ""} currentImage=${opts.locked.image || "(empty)"}
Keep this layout unless the instruction requires a different body layout (then layout-get → update). Never use hero/cover.`
    : fullRedo
      ? `FULL REDO MODE: pick a strong body layout via layout-match/layout-get, run photo pipeline, rewrite content so the slide is clearly new. Never use hero/cover.`
      : `Keep the existing layout of slide ${opts.slideIndex} unless the instruction requires a different body layout.`;
  return `Rewrite ONLY slide ${opts.slideIndex} in place (slidev-get-slide then slidev-update-slide).
Topic: ${opts.topic}
locale=${opts.locale}
User instruction (already reflected in outline; honor it):
${opts.instruction.trim()}

${current}

Outline slide ${opts.slideIndex} (content fields; visual may match a new layout if instruction asked):
${JSON.stringify(opts.slide)}

Rules:
- Call slidev-get-slide with no=${opts.slideIndex} first, then update that same no=
- Do not change any other slide
- Photo tools if user asked for a new image, attached a photo, current image is empty/missing for a photo layout${fullRedo ? ", or FULL REDO MODE" : ""}
- iconHint allowlist: ${LAYOUT_ICON_HINTS}`;
}

export function composeOneSlideMaxSteps(): number {
  return 18;
}

export function rewriteRepairPrompt(opts: {
  slideIndex: number;
  error: string;
  md: string;
  locked?: LockedSlideLayout;
}): string {
  const hint = opts.locked?.layout
    ? `Текущий layout был ${opts.locked.layout}${opts.locked.variant ? ` variant=${opts.locked.variant}` : ""}. Можно починить поля того же layout или сменить на другой BODY layout через layout-get если ошибка требует. Не используй hero/cover.`
    : `Почини layout/поля текущего BODY слайда. Не используй hero/cover.`;
  return `Сборка Slidev / layout render упала после пересборки слайда ${opts.slideIndex}.
Исправь ТОЛЬКО слайд ${opts.slideIndex} через tools (slidev-get-slide / slidev-update-slide, layout-get при смене layout, image tools если не хватает image).
${hint}
Не трогай другие слайды. Не переписывай весь файл текстом. Не вызывай hero-list/hero-get.
Если LayoutError[<layout>] — почини frontmatter/body поля именно слайда ${opts.slideIndex}.
Ошибка:
${opts.error}
Текущий md (справочно):
${opts.md}`;
}

/** Hero-slide rewrite via MCP — hero catalog + fields/images (NOT body layout MCP). */
export function rewriteHeroSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You rewrite ONLY the hero/cover Slidev slide (slide 1) through tools. Never dump or rewrite the whole slides.md as text.
This is the HERO rewrite flow — do NOT call layout-list, layout-get, or layout-match.

Tools:
- Hero MCP: hero-list, hero-get. Use when changing variant or when you need the variant fields[] contract.
- Slidev MCP: slidev-update-slide only (slide 1). Do NOT call slidev-get-slide, insert, remove, move, list, get-info.
- User uploads (when present): upload-image-list, upload-image-search, upload-image-use
- Yandex Images: yandex-image-search, yandex-image-download
- Unsplash: stock-search, stock-download
- OpenAI image-generate (LAST): when upload/Yandex/Unsplash fail or wrong subject — local /slide-1-gen.png

Variant (soft lock, unless FULL REDO — see user prompt):
- Keep layout: hero forever. Never switch to image-right/image-left/timeline/etc.
- DEFAULT: keep the current variant; only edit H1, body sentences, kicker, brand, source, optional image:.
- CHANGE variant if the user asked for a different hero style/variant OR FULL REDO MODE (then pick a DIFFERENT variant):
  1) hero-list → hero-get on the chosen id
  2) slidev-update-slide with layout: hero + new variant + fields from the contract
- Valid variants only: ribbon | corner | inset | fullbleed | product

Photo pipeline (if user asked to change/replace the image, attached a photo, image: is empty/missing, OR FULL REDO MODE):
  1) If upload tools exist: ONE upload-image-search → upload-image-use (filename slide-1.jpg)
  2) Else ONE yandex-image-search → prefer suggestedId → yandex-image-download (slide-1.jpg)
  3) Else ONE stock-search → stock-download OR image-generate (slide-1-gen.png)
  4) slidev-update-slide with local image: path
If only text/field changes (not FULL REDO) and image exists — do NOT call image search/download/generate.

Do NOT insert, remove, or move slides. Do NOT touch slides 2+.
Do NOT change theme/palette.

Hero fields:
  Frontmatter REQUIRED: layout: hero, variant: <id>, image: local path
  OPTIONAL: kicker, brand, source
  Body: # H1 + 1–2 short sentences. No bullet lists. No emoji. Respect variant fields[].limit.

Language: ${lang}.
Picker theme hint: ${theme}.
Finish when slide 1 matches the instruction via slidev-update-slide (still layout: hero).`;
}

export function rewriteHeroUserPrompt(opts: {
  slide: OutlineSlide;
  locale: string;
  topic: string;
  instruction: string;
  locked?: LockedSlideLayout;
}): string {
  const fullRedo = isFullRedoInstruction(opts.instruction);
  const current = opts.locked
    ? fullRedo
      ? `CURRENT: layout=hero variant=${opts.locked.variant || "(missing)"} currentImage=${opts.locked.image || "(empty)"}
FULL REDO MODE: MUST pick a DIFFERENT hero variant than ${opts.locked.variant || "current"} (hero-list → hero-get). MUST run photo pipeline for a fresh image. Rewrite H1 + promise so the cover looks clearly new. Keep layout: hero.`
      : `CURRENT: layout=hero variant=${opts.locked.variant || "(missing)"} currentImage=${opts.locked.image || "(empty)"}
Keep layout: hero. Keep variant unless instruction asks to change style.`
    : fullRedo
      ? `FULL REDO MODE: pick a strong hero variant via hero-list/hero-get, run photo pipeline, rewrite cover copy. Keep layout: hero.`
      : `CURRENT: layout=hero
Keep layout: hero.`;
  return `Rewrite ONLY the hero (slide 1) in place via slidev-update-slide.
Topic: ${opts.topic}
locale=${opts.locale}
User instruction:
${opts.instruction.trim()}

${current}

Outline / content source for hero:
${JSON.stringify(opts.slide)}

Rules:
- Keep layout: hero. Change variant if instruction asks OR FULL REDO MODE (hero-list → hero-get first).
- Photo tools if user asked for a new image, attached a photo, image is empty, OR FULL REDO MODE
- Body: H1 + 1–2 sentences, no bullets
- Leave all other slides untouched`;
}

export function rewriteHeroMaxSteps(): number {
  return 14;
}

export function rewriteHeroRepairPrompt(opts: {
  error: string;
  md: string;
  locked?: LockedSlideLayout;
}): string {
  const variant = opts.locked?.variant ? ` variant=${opts.locked.variant}` : "";
  return `Сборка Slidev / layout render упала после пересборки hero (slide 1).
Исправь ТОЛЬКО слайд 1 через tools (hero-list/hero-get при необходимости, slidev-update-slide, image tools если не хватает image).
Сохрани layout: hero${variant}. Не уводи в другой layout. Не вызывай layout-list/layout-get/layout-match.
Не трогай слайды 2+. Не переписывай весь файл текстом.
Ошибка:
${opts.error}
Текущий md (справочно):
${opts.md}`;
}

/** @deprecated use rewriteHeroUserPrompt — kept for older call sites. */
export function heroRewriteUserPrompt(opts: {
  slide: OutlineSlide;
  locale: string;
  topic: string;
  deckTitle: string;
  instruction: string;
  locked?: LockedSlideLayout;
}): string {
  return rewriteHeroUserPrompt({
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
