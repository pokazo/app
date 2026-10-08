export function composeSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You compose a Slidev deck ONLY through tools. Never dump or rewrite the whole slides.md as text.

Tools:
- Slidev MCP: slidev-get-info, slidev-list-slides, slidev-get-slide, slidev-update-slide, slidev-insert-slide, slidev-remove-slide, slidev-move-slide
- Unsplash stock: stock-search, stock-download. Search returns description/altDescription — judge if the photo is the RIGHT subject.
- OpenAI image-generate (cheap gpt-image-1-mini, low quality): use when stock is empty OR hits are the wrong subject (e.g. wrong car/brand). Writes local /slide-N-gen.png.

Visual rules:
- Follow outline: same slide count and order; honor each slide intent and visual hint.
- You MAY refine headings/copy and pick exact layout; do NOT invent extra slides.
- Prefer variety: image-right, image-left, two-cols (::right::), quote, fact, timeline, stats, skills — avoid every slide being default bullets.
- Slide 1 is already a finished hero (composed by a separate hero agent). Do NOT update, remove, or replace slide 1. Do NOT change its layout/variant/image.
- For visual two-cols: layout: two-cols. Structure MUST be: H1 title ABOVE ::left::, then ::left:: column, then ::right:: column. Never put the H1 inside ::left::. Short columns (≤4 bullets each). No emoji in headings or bullets. Example body:
  # Title here
  ::left::
  - point A
  - point B
  ::right::
  - point C
  - point D
- For visual timeline: layout: timeline. Put kicker, source, and steps (3–5 objects: phase, title, body, state done|current|todo) in frontmatter. Body of the slide is only the H1 title.
- For visual stats: layout: stats. Put kicker, source, and frontmatter items (not stats) — 2–4 objects: value, label, note. Body is only the H1. Key name is items: (YAML list). Never use stats: as the frontmatter key.
- For visual skills: layout: skills. Put kicker and items (name, level, pct 0–100) in frontmatter. Body is only the H1.
- Timeline steps.phase is a human label (Начало, Рост, 2019) — never copy state (done/current/todo) into phase.
- Photo slides (visual image-right, image-left, and any remaining slide with a non-empty imageQuery — NOT slide 1):
  1) stock-search (English query from imageQuery, orientation landscape)
  2) Read description/altDescription. If empty results OR clearly wrong subject → image-generate with a precise English prompt that NAMES the subject (brand/model/scene), filename slide-N-gen.png
  3) Else stock-download (id, filename slide-N.jpg)
  4) insert/update with layout + image: /slide-N.jpg or /slide-N-gen.png
  Local paths only — never http(s) image URLs. Never use expensive/high image quality.
- If one search is empty or off-topic, retry once with a simpler English query (2–4 concrete nouns). If still wrong/empty → image-generate for that slide.
- Never treat one stock error as permission to skip photos for the rest of the deck.
- Slide 1 already has a local hero image. Finish with at least 3 local image: paths total (hero + ≥2 more).
- Dense facts: prefer concrete numbers, named entities, and source: on stats/timeline/comparison slides. For side-by-side specs use two-cols or a markdown table in default layout — not vague marketing bullets.
- Icons: carbon-* / mdi-* style icons when visual=icon; no custom Vue SFCs, no <script>.
- theme/palette are already set in headmatter — do not change theme or palette.
- Language: ${lang}.
- One strong idea per slide; heading short; ≤5 bullets; numbers can be large in content.

Structural rules:
- Slide 1 (hero) is already composed. Leave it alone. Insert outline slides 2..N ONE AT A TIME after slide 1 (sequential inserts only — never parallel insert with future after: numbers). Do not insert an extra blank first slide.
- After inserts, call slidev-list-slides to verify count matches outline.
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
Аудитория: ${opts.audience}
Число слайдов: ровно ${opts.slideCount}
${researchBriefBlock(opts.researchMarkdown)}Составь оглавление презентации.

Для каждого слайда укажи: heading, points, intent, visual (включая timeline|stats|skills|hero), imageQuery, iconHint, kicker, source, steps, stats, skills.
steps — массив {phase,title,body,state:done|current|todo} только для visual=timeline (3–5 шт), иначе [].
stats — массив {value,label,note} только для visual=stats (2–4 шт), иначе [].
skills — массив {name,level,pct} только для visual=skills, иначе [].
kicker/source — короткие подписи или "". Для stats/timeline с цифрами source обязателен (откуда факт), иначе "".
imageQuery — английский поисковый запрос под РЕАЛЬНЫЙ объект темы (конкретная модель/сцена, 4–8 слов); иначе "".

Жёсткие правила плана (проверка тестами; провал = доработка):
- Ни одного пустого слайда: у каждого непустой heading и заполненный payload под visual.
- Ни одного слайда «только текст»: запрещены visual none|default|center|section|intro|end.
- Каждый слайд — один из: cover|hero|image-right|image-left|icon|timeline|stats|skills|two-cols|quote|fact — с обязательным payload (imageQuery / iconHint / steps≥3 / stats≥2 / skills≥2 / points).
- cover/hero в начале с imageQuery и текстом (points или kicker).
- Минимум 3 слайда image-right или image-left с imageQuery.
- Хотя бы один timeline или stats или skills с полным payload.
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
Аудитория: ${opts.audience}
Число слайдов: ровно ${opts.slideCount}
${researchBriefBlock(opts.researchMarkdown)}
Ошибки тестов плана:
${opts.issues}

Правила (обязательно устранить все ошибки):
- Не оставляй пустых слайдов (heading + payload).
- Не оставляй слайдов только с текстом: нельзя none|default|center|section|intro|end.
- Для image/hero/cover нужен imageQuery; для icon — iconHint; timeline — ≥3 steps; stats — ≥2; skills — ≥2.
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
  stock-search → judge description/altDescription → stock-download OR image-generate → then insert/update with image: /slide-N.jpg or /slide-N-gen.png.
If stock hits are the wrong subject, do NOT download them — image-generate with the exact subject named in the prompt.
For visual=stats: map outline.stats → frontmatter items: (never stats:). Body = H1 only. Keep source when present.
For visual=two-cols: H1 title ABOVE ::left::, then ::left:: / ::right::; no emoji. Use for comparisons when useful.
Hero already has one local image. At least 3 local image: paths total when finished.
Do not skip remaining photos after one stock error — retry once, then generate, then continue.
outline:
${JSON.stringify(outline)}
locale=${locale}`;
}
