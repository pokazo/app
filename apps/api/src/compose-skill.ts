export function composeSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You compose a Slidev deck ONLY through tools. Never dump or rewrite the whole slides.md as text.

Tools:
- Slidev MCP: slidev-get-info, slidev-list-slides, slidev-get-slide, slidev-update-slide, slidev-insert-slide, slidev-remove-slide, slidev-move-slide
- Unsplash stock (always available): stock-search, stock-download. MUST call stock-search then stock-download, then set frontmatter image: /slide-N.jpg (local path only).

Visual rules:
- Follow outline: same slide count and order; honor each slide intent and visual hint.
- You MAY refine headings/copy and pick exact layout; do NOT invent extra slides.
- Prefer variety: cover, image-right, image-left, two-cols (::right::), quote, fact, timeline, stats, section, end — avoid every slide being default bullets.
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
- Cover/intro: layout: hero with kicker (uppercase short label). Body: H1 + 1–2 sentences, no bullet list. hero and cover also get a photo (background or image-right) via stock-download.
- Timeline steps.phase is a human label (Начало, Рост, 2019) — never copy state (done/current/todo) into phase.
- Photo slides (visual image-right, image-left, hero, cover, and any slide with a non-empty imageQuery): stock-search (English query from imageQuery, orientation landscape) → stock-download (id from search, filename slide-N.jpg) → insert/update with layout + image: /slide-N.jpg. Local paths only — never http(s) image URLs.
- If one search is empty, retry once with a simpler English query (2–4 concrete nouns, no people names). Then still insert that slide with a photo if the retry returns hits.
- Only skip a photo on that one slide if BOTH search attempts return error/empty. Never treat one stock error as permission to skip photos for the rest of the deck. Keep calling stock-search for later image slides.
- A finished deck with fewer than 3 local images is a failure. at least 3 slides must have image: /slide-N.jpg before you stop.
- Icons: carbon-* / mdi-* style icons when visual=icon; no custom Vue SFCs, no <script>.
- theme is already ${theme} in headmatter — do not change theme.
- Language: ${lang}.
- One strong idea per slide; heading short; ≤5 bullets; numbers can be large in content.

Structural rules:
- Scaffold already has slide 1 with theme/title. Update that same slide in place (do not insert an extra blank first slide). Then insert remaining slides ONE AT A TIME (sequential inserts only — never parallel insert with future after: numbers).
- After inserts, call slidev-list-slides to verify count matches outline.
- Finish when list-slides length matches outline AND at least 3 slides have local image: paths.`;
}

export function outlineUserPrompt(opts: {
  topic: string;
  locale: string;
  audience: string;
  slideCount: number;
}): string {
  return `Тема: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${opts.audience}
Число слайдов: ${opts.slideCount}
Составь оглавление презентации.

Для каждого слайда укажи: heading, points, intent, visual (включая timeline|stats|skills|hero), imageQuery, iconHint, kicker, source, steps, stats, skills.
steps — массив {phase,title,body,state:done|current|todo} только для visual=timeline (3–5 шт), иначе [].
stats — массив {value,label,note} только для visual=stats (2–4 шт), иначе [].
skills — массив {name,level,pct} только для visual=skills, иначе [].
kicker/source — короткие подписи или "".
imageQuery — английский Unsplash-запрос (конкретная сцена без имён людей, 4–8 слов) для каждого фото-слайда; иначе "".
Правила: cover/hero в начале; hero/cover тоже с imageQuery; минимум 3 слайда с visual image-right или image-left; хотя бы один timeline или stats если тема про путь/цифры/резюме; минимум треть слайдов с visual из image-right, image-left, icon, two-cols, quote, fact, timeline, stats, skills.
Не пиши markdown — только JSON-структуру.`;
}

export function composeUserPrompt(outline: unknown, locale: string): string {
  return `Собери колоду по outline через tools.
Для каждого слайда с visual image-right, image-left, hero, cover или непустым imageQuery: stock-search then stock-download BEFORE insert/update. Put image: /slide-N.jpg in frontmatter.
For visual=stats: map outline.stats → frontmatter items: (never stats:). Body = H1 only.
For visual=two-cols: H1 title ABOVE ::left::, then ::left:: / ::right::; no emoji.
Do not finish with zero local images. At least 3 downloads.
Do not skip remaining photos after one stock error — retry once with a simpler English query, then continue.
outline:
${JSON.stringify(outline)}
locale=${locale}`;
}
