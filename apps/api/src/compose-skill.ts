import { layoutCarbonIconHints } from "../slidev-layouts/layout-assert.js";
import { audienceForPrompt } from "./audience.js";

const LAYOUT_ICON_HINTS = layoutCarbonIconHints().join(", ");

export function composeSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You compose a Slidev deck ONLY through tools. Never dump or rewrite the whole slides.md as text.

Tools:
- Slidev MCP: slidev-get-info, slidev-list-slides, slidev-get-slide, slidev-update-slide, slidev-insert-slide, slidev-remove-slide, slidev-move-slide
- User uploads (FIRST when present): upload-image-search, upload-image-use (optional upload-image-list). Prefer originalName/filename over a vague caption. If suggestedId is set OR originalName tokens match the subject → IMMEDIATELY upload-image-use BEFORE any yandex/stock/generate. Do not skip uploads because caption says "solid/abstract/no subject".
- Yandex Images (SECOND): yandex-image-search, yandex-image-download. Prefer natural Russian query. Judge title/domain/pageUrl (synthesized title from URL is OK).
- Unsplash (THIRD): stock-search, stock-download. English query. Judge description/altDescription.
- OpenAI image-generate (LAST, cheap gpt-image-1-mini, low quality): when upload/Yandex/Unsplash are empty OR wrong subject. Writes local /slide-N-gen.png.

Visual rules:
- Follow outline: same slide count and order; honor each slide intent and visual hint.
- You MAY refine headings/copy and pick exact layout; do NOT invent extra slides.
- Prefer variety: image-right, image-left, two-cols (::right::), quote, fact, icon, cards, timeline, stats, skills, statement, features, process, spotlight, pie — avoid every slide being default bullets.
- Slide 1 is already a finished hero (composed by a separate hero agent). Do NOT update, remove, or replace slide 1. Do NOT change its layout/variant/image.
- For visual two-cols: layout: two-cols. Structure MUST be: H1 title ABOVE ::left::, then ::left:: column, then ::right:: column. Never put the H1 inside ::left::. Short columns (≤4 bullets each). No emoji in headings or bullets. Optional kicker/source in frontmatter. Example body:
  # Title here
  ::left::
  - point A
  - point B
  ::right::
  - point C
  - point D
- For visual quote: layout: quote. Body = quote text (H1 or paragraph) plus attribution as a bullet or short line; optional kicker/source. No emoji.
- For visual fact: layout: fact. Body = short H1 claim (≤12 words) on the left; optional supporting line on the right; optional kicker/source.
- For visual icon: layout: icon. Put iconHint from allowlist only (${LAYOUT_ICON_HINTS}). Body = H1 + ≤4 bullets. No emoji. Never invent names.
- For visual cards: layout: cards. Put kicker and frontmatter items (not cards) — 2–4 objects: title, body. Body of the slide is only the H1. Key name is items: (YAML list). Map outline.cards → items:. Never use cards: as the frontmatter key.
- For visual timeline: layout: timeline. Put kicker, source, and steps (3–5 objects: phase, title, body, state done|current|todo) in frontmatter. Body of the slide is only the H1 title.
- For visual stats: layout: stats. Put kicker, source, and frontmatter items (not stats) — 2–4 objects: value, label, note. Body is only the H1. Key name is items: (YAML list). Never use stats: as the frontmatter key.
- For visual skills: layout: skills. Put kicker and items (name, level, pct 0–100) in frontmatter. Body is only the H1.
- For visual statement: layout: statement. Body = bold H1 (≈3–10 words — longer clips at top) + short supporting line (bottom-anchored). Optional kicker. Prefer dark/ink closing or manifesto slides.
- For visual features: layout: features. Put kicker and items (exactly 3): title, body, iconHint — ONLY from allowlist (${LAYOUT_ICON_HINTS}). Body is only the H1. Map outline.features → items:. Never invent icon names outside the list.
- For visual process: layout: process. Put kicker and steps (3–5): title, iconHint — same allowlist. Body is only the H1. Map outline.process → steps:.
- For visual spotlight: layout: spotlight. REQUIRED frontmatter: palette (cream|ink|auto|ocean|forest|slate|amber|wine|neon|sunset|candy|volt — model picks bg), image: /local.png, items: exactly 4 {title,body}. Map outline.cards → items: (never cards:). Map outline.palette → palette:. Body = H1 + one description paragraph from points[0] (no bullets). Honor fields[].limit char caps (H1≤42, desc≤90, title≤14 — one line, 1–2 short words, no wrapping/ellipsis; body≤40). Center image; pairs at edges — do not omit palette.
- For visual pie: layout: pie. Frontmatter: chartTitle?, items: 3–5 {label, value} (never pie: as key). Map outline.pie → items:, outline.chartTitle → chartTitle:. Body = H1 + description from points[0]. Honor char caps (H1≤42, desc≤90, label≤16, chartTitle≤48). Values are share weights (normalized to %); no photo required.
- Timeline steps.phase is a human label (Начало, Рост, 2019) — never copy state (done/current/todo) into phase.
- Photo slides (visual image-right, image-left, spotlight, and any remaining slide with a non-empty imageQuery — NOT slide 1):
  1) If upload tools exist: ONE upload-image-search (query from imageQuery). If suggestedId is set → IMMEDIATELY upload-image-use (filename slide-N.jpg). Else pick the hit whose originalName best matches the subject and upload-image-use. Only skip uploads when the tool errors or the list is empty.
  2) Only if uploads empty/error/no usable hit → ONE yandex-image-search (Russian/natural query; orientation horizontal)
  3) If suggestedId or on-topic domain/pageUrl/title → IMMEDIATELY yandex-image-download (empty title is fine)
  4) Only if Yandex empty/all-wrong/error → ONE stock-search → stock-download OR image-generate (filename slide-N-gen.png)
  5) insert/update with layout + image: /slide-N.jpg or /slide-N-gen.png
  Local paths only — never http(s) image URLs. Never use expensive/high image quality.
- At most ONE upload-image-search, ONE yandex-image-search and ONE stock-search per photo slide. Never search Yandex twice for the same slide.
- Never treat one stock error as permission to skip photos for the rest of the deck.
- Slide 1 already has a local hero image. Finish with at least 3 local image: paths total (hero + ≥2 more).
- Dense facts: prefer concrete numbers, named entities, and source: on stats/timeline/comparison slides. For side-by-side specs use two-cols or a markdown table in default layout — not vague marketing bullets.
- Icons: iconHint for icon|features|process MUST be copied from the allowlist above (or layout-get iconHints). No custom Vue SFCs, no <script>.
- Before insert/update of any body slide: call layout-get for that layout id and OBEY every fields[].limit (overflow clips). Do not invent longer copy than the contract.
- Layouts throw LayoutError[<name>] when data cannot be shown (e.g. stats/cards need ≥2 items, timeline ≥3 steps, image-* need local image: + short copy within fields[].limit, hero needs valid variant). If build/repair reports LayoutError[…], fix that slide's frontmatter/body only — do not rewrite the whole deck; leave slide 1 hero alone unless the error names hero.
- theme is already set in headmatter — do not change theme. Deck palette is pinned on most slides; for layout: spotlight you MUST set that slide's palette: from outline.palette / layout-get (model-chosen background).
- Language: ${lang}.
- One strong idea per slide; heading short; ≤5 bullets; numbers can be large in content.

Structural rules:
- Slide 1 (hero) is already composed. Leave it alone. Insert outline slides 2..N ONE AT A TIME after slide 1 (sequential inserts only — never parallel insert with future after: numbers). Do not insert an extra blank first slide.
- Do NOT start with slidev-get-info / slidev-get-slide on slide 1 — go straight to photo + insert for slides 2..N.
- After all inserts, call slidev-list-slides ONCE to verify count. Do NOT call slidev-get-slide on every slide for a final review sweep.
- Finish when list-slides length matches outline AND at least 3 slides have local image: paths.
- Picker theme hint (do not rewrite frontmatter theme): ${theme}.`;
}

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

export function outlineUserPrompt(opts: {
  topic: string;
  locale: string;
  audience: string;
  slideCount: number;
  researchMarkdown?: string;
}): string {
  return `Тема: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${audienceForPrompt(opts.audience)}
Число слайдов: ровно ${opts.slideCount}
${researchBriefBlock(opts.researchMarkdown)}Составь оглавление презентации.

Сначала через MCP: layout-list / layout-match / layout-get — выбери visual по контракту layout’а. Читай fields[].limit и не превышай их в heading/points/kicker. Затем outline-validate (outlineJson + slideCount); при ok:false правь по issues[].expect и вызывай снова. Только при ok:true — submit_outline.

Для каждого слайда укажи: heading, points, intent, visual (включая timeline|stats|skills|hero|cards|quote|fact|icon|two-cols|statement|features|process|spotlight|pie), imageQuery, iconHint, kicker, source, steps, stats, skills, cards, features, process, palette, pie, chartTitle.
steps — массив {phase,title,body,state:done|current|todo} только для visual=timeline (3–5 шт), иначе [].
stats — массив {value,label,note} только для visual=stats (2–4 шт), иначе [].
skills — массив {name,level,pct} только для visual=skills, иначе [].
cards — массив {title,body} для visual=cards (2–4 шт) ИЛИ visual=spotlight (ровно 4 шт с короткими title/body), иначе [].
features — массив {title,body,iconHint} только для visual=features (ровно 3), иначе []. iconHint ТОЛЬКО из: ${LAYOUT_ICON_HINTS}.
process — массив {title,iconHint} только для visual=process (3–5 шт), иначе []. iconHint из того же allowlist.
palette — id фона (cream|ink|auto|ocean|forest|slate|amber|wine|neon|sunset|candy|volt) только для visual=spotlight, иначе "".
pie — массив {label,value} только для visual=pie (3–5 шт, value>0), иначе [].
chartTitle — короткий заголовок над pie только для visual=pie, иначе "".
Для visual=spotlight: imageQuery обязателен; points[0] = description (≤90 символов); cards ровно 4 (title≤14 символов — одна строка, 1–2 коротких слова, иначе обрежется «…»; body≤40 символов); heading ≤42 символов; palette обязателен.
Для visual=pie: pie 3–5 slices; points[0]=description (≤90); heading ≤42; label ≤16; chartTitle ≤48.
Для visual=icon поле iconHint — из того же allowlist.
kicker/source — короткие подписи или "". Для stats/timeline с цифрами source обязателен (откуда факт), иначе "".
imageQuery — поисковый запрос под РЕАЛЬНЫЙ объект темы (конкретная модель/сцена, 4–8 слов); для locale=ru — на русском (для Yandex Images); иначе на языке темы / английском; иначе "".

Жёсткие правила плана (проверка тестами; провал = доработка):
- Ни одного пустого слайда: у каждого непустой heading и заполненный payload под visual.
- Ни одного слайда «только текст»: запрещены visual none|default|center|section|intro|end.
- Каждый слайд — один из: cover|hero|image-right|image-left|icon|timeline|stats|skills|two-cols|quote|fact|cards|statement|features|process|spotlight|pie — с обязательным payload (imageQuery / iconHint / steps≥3 / stats≥2 / skills≥2 / cards≥2 / features=3 / process≥3 / spotlight=palette+imageQuery+cards×4+points / pie=3–5+points / points).
- cover/hero в начале с imageQuery и текстом (points или kicker).
- Минимум 3 слайда image-right или image-left с imageQuery.
- Хотя бы один timeline или stats или skills или cards или features или process или spotlight или pie с полным payload.
- Для feature-list / сетки преимуществ предпочитай visual=features (3 колонки с iconHint) или visual=cards.
- Для product/hero с центральным фото и 4 короткими пунктами по краям — visual=spotlight (palette + imageQuery + cards×4).
- Для market share / composition 3–5 частей с числами — visual=pie (pie[] + chartTitle + points[0]).
- Для горизонтального flow / pipeline предпочитай visual=process (не timeline).
- В points/stats — конкретные факты и числа по теме, не общие маркетинговые фразы.
Не пиши markdown — только JSON-структуру.`;
}

export function outlineRevisePrompt(opts: {
  topic: string;
  locale: string;
  audience: string;
  slideCount: number;
  previous: unknown;
  issues: string;
  researchMarkdown?: string;
}): string {
  return `План презентации не прошёл проверки. Исправь ВЕСЬ outline JSON и верни полную структуру заново.

Тема: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${audienceForPrompt(opts.audience)}
Число слайдов: ровно ${opts.slideCount}
${researchBriefBlock(opts.researchMarkdown)}
Ошибки тестов плана (каждая с expect.outlineFields / antiPatterns / example / limits / iconHints — правь строго по expect; limits.H1 не нарушай):
${opts.issues}

Правила (обязательно устранить все ошибки):
- Не оставляй пустых слайдов (heading + payload).
- Не оставляй слайдов только с текстом: нельзя none|default|center|section|intro|end.
- Для image/hero/cover/spotlight нужен imageQuery; для icon — iconHint из allowlist; timeline — ≥3 steps; stats — ≥2; skills — ≥2; cards — ≥2; features — 3; process — ≥3; spotlight — palette + cards ровно 4 + points[0]; pie — 3–5 slices + points[0].
- iconHint для icon|features|process — только из: ${LAYOUT_ICON_HINTS} (или из issue.expect.iconHints).
- Добавь source на слайды stats/timeline с цифрами.
- Факты и source бери из Research brief выше, не выдумывай.

Предыдущий план (исправь его, не упрощай):
${JSON.stringify(opts.previous)}

Не пиши markdown — только исправленный JSON outline.`;
}

export function composeUserPrompt(outline: unknown, locale: string): string {
  return `Собери ОСТАЛЬНЫЕ слайды колоды по outline через tools.
Slide 1 (hero) уже готов — не обновляй и не удаляй его.
Для каждого слайда со 2-го с visual image-right, image-left или непустым imageQuery:
  If upload tools exist: ONE upload-image-search → prefer suggestedId → upload-image-use
  OR (only if empty/wrong/missing) ONE yandex-image-search → prefer suggestedId → yandex-image-download
  OR (only if empty/wrong/error) ONE stock-search → stock-download
  OR image-generate → then insert/update with image: /slide-N.jpg or /slide-N-gen.png.
Empty Yandex title is OK — use domain/pageUrl/suggestedId. Do not call upload-image-search or yandex-image-search twice per slide.
For visual=stats: map outline.stats → frontmatter items: (never stats:). Body = H1 only. Keep source when present.
For visual=cards: map outline.cards → frontmatter items: (never cards:). Body = H1 only. Optional kicker.
For visual=two-cols: H1 title ABOVE ::left::, then ::left:: / ::right::; no emoji. Use for comparisons when useful.
For visual=quote|fact|icon|statement: use matching layout; icon needs iconHint; fact = short H1 claim; quote = quote + attribution; statement = bottom-anchored H1 + line.
For visual=features: map outline.features → frontmatter items: (title, body, iconHint from allowlist). Body = H1 only.
For visual=process: map outline.process → frontmatter steps: (title, iconHint from allowlist). Body = H1 only.
For visual=spotlight: map outline.palette → palette:, outline.cards → items: (exactly 4), image: local path, body = H1 + points[0] as description. OBEY char limits from layout-get.
For visual=pie: map outline.pie → items: (3–5 {label,value}), outline.chartTitle → chartTitle:, body = H1 + points[0]. OBEY char limits from layout-get.
Before each body slide insert/update: layout-get that id and OBEY fields[].limit.
iconHint allowlist: ${LAYOUT_ICON_HINTS}.
Hero already has one local image. At least 3 local image: paths total when finished.
Do not skip remaining photos after one stock error — one upload attempt (if tools exist), then one Yandex, then one Unsplash, then generate, then continue.
outline:
${JSON.stringify(outline)}
locale=${locale}`;
}
