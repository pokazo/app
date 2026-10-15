/** Source-of-truth descriptions for outline/compose layout selection (MCP). */

import {
  layoutCarbonIconHints,
  PIE_CONTENT_LIMITS,
  SPOTLIGHT_CONTENT_LIMITS,
} from "../slidev-layouts/layout-assert.js";

const ICON_HINTS = layoutCarbonIconHints();
const ICON_HINTS_FIELD = `iconHint ONLY from: ${ICON_HINTS.join(", ")}`;

export { SPOTLIGHT_CONTENT_LIMITS, PIE_CONTENT_LIMITS };

/** One frontmatter or body field the layout accepts (mirror hero-catalog). */
export type LayoutFieldSpec = {
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

export type LayoutCatalogEntry = {
  id: string;
  summary: string;
  whenToUse: string;
  antiPatterns: string;
  outlineFields: string;
  frontmatter: string;
  body: string;
  displays: string;
  example: string;
  tags: string[];
  /** Exact fields — call layout-get before slidev-update-slide; honor limit. */
  fields: LayoutFieldSpec[];
  /** Allowed carbon-* iconHints for icon|features|process */
  iconHints?: string[];
};

/**
 * Content caps for image-right/left half-pane — keep in sync with fields[].limit.
 * Used by markdown assert so overflow fails the gate instead of clipping silently.
 */
export const IMAGE_SPLIT_CONTENT_LIMITS = {
  maxBullets: 3,
  /** Uppercase + letter-spacing makes long kickers clip; keep well under half-pane width. */
  maxKickerChars: 28,
} as const;

const f = {
  layout: (id: string): LayoutFieldSpec => ({
    name: "layout",
    required: true,
    in: "frontmatter",
    type: `"${id}"`,
    expects: `Must be exactly "${id}"`,
  }),
  kicker: (limit = "2–5 words, ALL CAPS"): LayoutFieldSpec => ({
    name: "kicker",
    required: false,
    in: "frontmatter",
    type: "string",
    expects: "Uppercase label above H1",
    limit,
  }),
  source: (): LayoutFieldSpec => ({
    name: "source",
    required: false,
    in: "frontmatter",
    type: "string",
    expects: "Citation when stating a fact; omit when unused",
    limit: "≤8 words",
  }),
  image: (): LayoutFieldSpec => ({
    name: "image",
    required: true,
    in: "frontmatter",
    type: "local path",
    expects: "Local path only (/slide-N.jpg or /slide-N-gen.png). Never http(s).",
  }),
  h1: (limit: string, expects = "Single H1 as first body line"): LayoutFieldSpec => ({
    name: "H1",
    required: true,
    in: "body",
    type: "markdown # heading",
    expects,
    limit,
  }),
  bullets: (limit: string): LayoutFieldSpec => ({
    name: "bullets",
    required: true,
    in: "body",
    type: "markdown list",
    expects: "Bullet list under H1",
    limit,
  }),
  iconHint: (): LayoutFieldSpec => ({
    name: "iconHint",
    required: true,
    in: "frontmatter",
    type: "carbon-*",
    expects: "Must be copied from this layout's iconHints allowlist",
  }),
  items: (limit: string, expects: string): LayoutFieldSpec => ({
    name: "items",
    required: true,
    in: "frontmatter",
    type: "YAML list",
    expects,
    limit,
  }),
  steps: (limit: string, expects: string): LayoutFieldSpec => ({
    name: "steps",
    required: true,
    in: "frontmatter",
    type: "YAML list",
    expects,
    limit,
  }),
};

const IMAGE_SPLIT_FIELDS = (id: "image-right" | "image-left"): LayoutFieldSpec[] => [
  f.layout(id),
  f.image(),
  f.kicker(
    `2–5 short words, ALL CAPS (≤${IMAGE_SPLIT_CONTENT_LIMITS.maxKickerChars} chars; letter-spacing clips)`,
  ),
  f.h1("≈2–8 words / 1–2 lines"),
  f.bullets(`≤${IMAGE_SPLIT_CONTENT_LIMITS.maxBullets} items; each ≤≈12 words`),
];

export const LAYOUT_CATALOG: LayoutCatalogEntry[] = [
  {
    id: "hero",
    summary: "Opening brand slide with variant + optional photo",
    whenToUse: "Slide 1 / cover energy: brand promise, product shot, fullbleed mood",
    antiPatterns: "Mid-deck bullets; dense facts",
    outlineFields: "visual=hero|cover; imageQuery; kicker; points or long heading",
    frontmatter: "layout: hero; variant: ribbon|corner|inset|fullbleed|product; image: /local.png; kicker",
    body: "H1 + short promise line",
    displays: "Large title on cream/ink; photo for fullbleed/product",
    example: '{ "visual": "hero", "heading": "Pokazo", "points": ["Decks from a brief"], "imageQuery": "presentation stage", "kicker": "BRAND" }',
    tags: ["open", "photo", "brand"],
    fields: [
      f.layout("hero"),
      {
        name: "variant",
        required: true,
        in: "frontmatter",
        type: "ribbon|corner|inset|fullbleed|product",
        expects: "Use hero MCP (hero-get) for variant-specific fields[].limit",
      },
      f.image(),
      f.kicker(),
      f.h1("≈2–8 words; longer titles clip", "Cover title — see hero-get for variant limit"),
      {
        name: "promise",
        required: true,
        in: "body",
        type: "1–2 sentences",
        expects: "Short paragraph under H1; no bullets",
        limit: "1–2 sentences",
      },
    ],
  },
  {
    id: "cover",
    summary: "Alias of hero for deck opening",
    whenToUse: "Same as hero — prefer at start with imageQuery",
    antiPatterns: "Using cover mid-deck for bullet lists",
    outlineFields: "visual=cover; imageQuery; kicker/points",
    frontmatter: "Mapped to hero by compose/hero agent",
    body: "H1 + promise",
    displays: "Opening slide",
    example: '{ "visual": "cover", "heading": "Title", "imageQuery": "topic object", "kicker": "INTRO" }',
    tags: ["open", "photo", "brand"],
    fields: [
      {
        name: "visual",
        required: true,
        in: "frontmatter",
        type: '"cover"',
        expects: "Outline visual=cover; compose maps to layout: hero — use hero-get for limits",
      },
      f.kicker(),
      f.h1("≈2–8 words"),
      {
        name: "promise",
        required: true,
        in: "body",
        type: "1–2 sentences",
        expects: "Short promise under H1",
        limit: "1–2 sentences",
      },
    ],
  },
  {
    id: "image-right",
    summary: "Text left, local photo right",
    whenToUse: "Concrete subject worth showing; narrative + photo",
    antiPatterns: "Abstract marketing with no real object for imageQuery; 4+ long bullets (half-pane clips)",
    outlineFields: "visual=image-right; imageQuery; points 1–3 short",
    frontmatter: "layout: image-right; image: /slide-N.jpg; kicker?",
    body: "H1 + ≤3 short bullets",
    displays: "Two columns: copy | photo",
    example: '{ "visual": "image-right", "heading": "On the factory floor", "points": ["Line A", "Line B", "Line C"], "imageQuery": "assembly line robots", "kicker": "FACTORY" }',
    tags: ["photo", "story"],
    fields: IMAGE_SPLIT_FIELDS("image-right"),
  },
  {
    id: "image-left",
    summary: "Local photo left, text right",
    whenToUse: "Same as image-right; vary photo side for rhythm",
    antiPatterns: "Same as image-right; 4+ long bullets",
    outlineFields: "visual=image-left; imageQuery; points 1–3 short",
    frontmatter: "layout: image-left; image: /slide-N.jpg",
    body: "H1 + ≤3 short bullets",
    displays: "Two columns: photo | copy",
    example: '{ "visual": "image-left", "heading": "In the field", "points": ["Detail A", "Detail B"], "imageQuery": "field technician", "kicker": "FIELD" }',
    tags: ["photo", "story"],
    fields: IMAGE_SPLIT_FIELDS("image-left"),
  },
  {
    id: "two-cols",
    summary: "Side-by-side bullet columns",
    whenToUse: "Compare A vs B, pros/cons, before/after lists",
    antiPatterns: "Single list; feature grid (use features/cards)",
    outlineFields: "visual=two-cols; points≥2 (split across columns in compose)",
    frontmatter: "layout: two-cols; kicker?",
    body: "H1 above ::left:: / ::right::",
    displays: "Title + two short columns",
    example: '{ "visual": "two-cols", "heading": "Buy vs build", "points": ["Speed", "Control", "Cost", "Risk"] }',
    tags: ["compare", "list"],
    fields: [
      f.layout("two-cols"),
      f.kicker(),
      f.h1("≈2–8 words"),
      {
        name: "left",
        required: true,
        in: "body",
        type: "::left:: column",
        expects: "Bullets after ::left::; H1 must stay ABOVE ::left::",
        limit: "≤4 short bullets",
      },
      {
        name: "right",
        required: true,
        in: "body",
        type: "::right:: column",
        expects: "Bullets after ::right::",
        limit: "≤4 short bullets",
      },
    ],
  },
  {
    id: "quote",
    summary: "Editorial pull-quote without decorative marks",
    whenToUse: "Voice, testimonial, proverb, one memorable line",
    antiPatterns: "Long paragraphs; multi-metric slides",
    outlineFields: "visual=quote; heading or points as quote + attribution",
    frontmatter: "layout: quote; kicker?",
    body: "H1 quote + attribution bullet/line",
    displays: "Accent bar + large type + attribution",
    example: '{ "visual": "quote", "heading": "Speed is a feature", "points": ["— Engineering proverb"], "kicker": "VOICE" }',
    tags: ["voice", "editorial"],
    fields: [
      f.layout("quote"),
      f.kicker(),
      f.h1("≈4–14 words (one memorable line)"),
      {
        name: "attribution",
        required: false,
        in: "body",
        type: "bullet or short line",
        expects: "Who said it / source line under the quote",
        limit: "≤8 words",
      },
    ],
  },
  {
    id: "fact",
    summary: "One KPI claim split with context",
    whenToUse: "Single striking metric or claim + short context/source",
    antiPatterns: "Many metrics (use stats); decorative icons",
    outlineFields: "visual=fact; short heading claim; optional point + source",
    frontmatter: "layout: fact; kicker?; source?",
    body: "H1 left; supporting line + source right",
    displays: "Split KPI / editorial fact",
    example: '{ "visual": "fact", "heading": "3× faster delivery", "points": ["One metric. Full slide."], "source": "Internal benchmark", "kicker": "FACT" }',
    tags: ["number", "kpi"],
    fields: [
      f.layout("fact"),
      f.kicker(),
      f.source(),
      f.h1("≤12 words", "Short KPI / claim as H1"),
      {
        name: "support",
        required: false,
        in: "body",
        type: "1 short line",
        expects: "Optional context under/ beside the claim",
        limit: "1 short sentence",
      },
    ],
  },
  {
    id: "icon",
    summary: "Carbon icon badge + title + short bullets",
    whenToUse: "One concept/idea with iconHint and ≤4 bullets",
    antiPatterns: "Missing iconHint; invented names; emoji",
    outlineFields: `visual=icon; ${ICON_HINTS_FIELD}; points≥1`,
    frontmatter: "layout: icon; iconHint: carbon-idea; kicker?",
    body: "H1 + bullets",
    displays: "Real Carbon SVG in frame + copy",
    example: '{ "visual": "icon", "heading": "Clear idea", "iconHint": "carbon-idea", "points": ["Short bullets"], "kicker": "IDEA" }',
    tags: ["concept", "icon"],
    iconHints: ICON_HINTS,
    fields: [
      f.layout("icon"),
      f.iconHint(),
      f.kicker(),
      f.h1("≈2–8 words"),
      f.bullets("≤4 items; each ≤≈12 words"),
    ],
  },
  {
    id: "cards",
    summary: "2–4 numbered feature cards",
    whenToUse: "Feature grid without per-item icons",
    antiPatterns: "Exactly 3 icon pillars (prefer features); <2 cards",
    outlineFields: "visual=cards; cards[{title,body}] 2–4",
    frontmatter: "layout: cards; items: (from cards); kicker?",
    body: "H1 only",
    displays: "Grid of titled cards with bodies",
    example: '{ "visual": "cards", "heading": "What you get", "cards": [{"title":"Alpha","body":"…"},{"title":"Beta","body":"…"}] }',
    tags: ["features", "grid"],
    fields: [
      f.layout("cards"),
      f.kicker(),
      f.items("2–4 cards", "YAML items: [{title, body}] — never use cards: as key"),
      f.h1("≈2–8 words", "Title only; card copy lives in items"),
    ],
  },
  {
    id: "features",
    summary: "Exactly 3 icon columns",
    whenToUse: "Three pillars/benefits each with carbon iconHint",
    antiPatterns: "2 or 4 items; cards without icons; iconHint outside allowlist",
    outlineFields: `visual=features; features[{title,body,iconHint}] length 3; ${ICON_HINTS_FIELD}`,
    frontmatter: "layout: features; items: …",
    body: "H1 only",
    displays: "Title + rule + 3 icon/title/body columns",
    example:
      '{ "visual": "features", "heading": "Three pillars", "features": [{"title":"Clarity","body":"…","iconHint":"carbon-idea"},{"title":"Trust","body":"…","iconHint":"carbon-security"},{"title":"Pace","body":"…","iconHint":"carbon-rocket"}] }',
    tags: ["features", "icon", "grid"],
    iconHints: ICON_HINTS,
    fields: [
      f.layout("features"),
      f.kicker(),
      f.items("exactly 3", "items: [{title, body, iconHint}] from allowlist"),
      f.h1("≈2–8 words", "Title only"),
    ],
  },
  {
    id: "timeline",
    summary: "Horizontal phases with progress rail",
    whenToUse: "History, roadmap phases with phase/title/body/state",
    antiPatterns: "Simple pipeline of icon steps (use process); <3 steps",
    outlineFields: "visual=timeline; steps 3–5 {phase,title,body,state}; source if numbers",
    frontmatter: "layout: timeline; steps: …; source?",
    body: "H1 only",
    displays: "Rail + phase columns",
    example:
      '{ "visual": "timeline", "heading": "Roadmap", "steps": [{"phase":"2024","title":"Launch","body":"…","state":"done"},{"phase":"2025","title":"Scale","body":"…","state":"current"},{"phase":"2026","title":"Expand","body":"…","state":"todo"}], "source": "Plan" }',
    tags: ["steps", "time"],
    fields: [
      f.layout("timeline"),
      f.kicker(),
      f.source(),
      f.steps("3–5 steps", "steps: [{phase, title, body, state}] — phase is a human label, not state"),
      f.h1("≈2–8 words", "Title only"),
    ],
  },
  {
    id: "process",
    summary: "Horizontal icon circles + arrows",
    whenToUse: "Pipeline / how-we-work flow 3–5 short step titles",
    antiPatterns: "Dated roadmap with bodies (use timeline); invented iconHint",
    outlineFields: `visual=process; process[{title,iconHint}] 3–5; ${ICON_HINTS_FIELD}`,
    frontmatter: "layout: process; steps: (from process)",
    body: "H1 only",
    displays: "Centered title + circle icons with arrows",
    example:
      '{ "visual": "process", "heading": "How we deliver", "process": [{"title":"Brief","iconHint":"carbon-document"},{"title":"Compose","iconHint":"carbon-paint-brush"},{"title":"Ship","iconHint":"carbon-checkmark"}] }',
    tags: ["steps", "flow", "icon"],
    iconHints: ICON_HINTS,
    fields: [
      f.layout("process"),
      f.kicker(),
      f.steps("3–5 steps", "steps: [{title, iconHint}] from allowlist; titles short"),
      f.h1("≈2–8 words", "Title only"),
    ],
  },
  {
    id: "stats",
    summary: "2–4 big number tiles",
    whenToUse: "Several metrics to scan together",
    antiPatterns: "Single KPI (use fact); empty notes ok but need value+label",
    outlineFields: "visual=stats; stats[{value,label,note}] 2–4; source",
    frontmatter: "layout: stats; items: (from stats); source",
    body: "H1 only",
    displays: "Title + stat cards",
    example:
      '{ "visual": "stats", "heading": "Traction", "stats": [{"value":"120%","label":"YoY","note":"ARR"},{"value":"40","label":"NPS","note":""}], "source": "Q3 report" }',
    tags: ["number", "kpi", "grid"],
    fields: [
      f.layout("stats"),
      f.kicker(),
      f.source(),
      f.items("2–4 stats", "items: [{value, label, note}] — never use stats: as key"),
      f.h1("≈2–8 words", "Title only"),
    ],
  },
  {
    id: "skills",
    summary: "Named bars with pct fill",
    whenToUse: "Stack strengths, proficiency, fill-of-budget style rows",
    antiPatterns: "Random marketing bullets; <2 items",
    outlineFields: "visual=skills; skills[{name,level,pct}] ≥2",
    frontmatter: "layout: skills; items: …",
    body: "H1 only",
    displays: "Rows of name/level + progress bar",
    example:
      '{ "visual": "skills", "heading": "Stack", "skills": [{"name":"TypeScript","level":"Expert","pct":90},{"name":"Vue","level":"Strong","pct":75}] }',
    tags: ["bars", "skills"],
    fields: [
      f.layout("skills"),
      f.kicker(),
      f.items("≥2 rows", "items: [{name, level, pct 0–100}]"),
      f.h1("≈2–8 words", "Title only"),
    ],
  },
  {
    id: "statement",
    summary: "Dark bottom-anchored closing line",
    whenToUse: "Manifesto, close, one takeaway — end or section breath",
    antiPatterns: "Busy lists; mid-deck feature dump",
    outlineFields: "visual=statement; heading + optional point",
    frontmatter: "layout: statement; kicker?",
    body: "H1 + short supporting line",
    displays: "Ink slide, content bottom-left with rule",
    example: '{ "visual": "statement", "heading": "Ship the sharp idea", "points": ["One clear takeaway"], "kicker": "CLOSE" }',
    tags: ["close", "editorial", "voice"],
    fields: [
      f.layout("statement"),
      f.kicker(),
      f.h1("≈3–10 words", "Bold closing line"),
      {
        name: "support",
        required: false,
        in: "body",
        type: "1 short line",
        expects: "Optional supporting sentence under H1",
        limit: "1 short sentence",
      },
    ],
  },
  {
    id: "spotlight",
    summary:
      "Center photo + title/description + exactly 4 edge pairs; model picks palette background",
    whenToUse:
      "Product/hero spotlight: one central photo flanked by four short title+body points; pick palette for mood",
    antiPatterns:
      "Fewer/more than 4 pairs; long copy (clips); missing image or palette; pairs overlapping the photo",
    outlineFields:
      "visual=spotlight; imageQuery; palette; points[0]=description; cards[{title,body}] exactly 4",
    frontmatter:
      "layout: spotlight; palette: ocean|cream|…; image: /local.png; items: (from cards); kicker?",
    body: "H1 + one description paragraph (no bullets)",
    displays: "Title/desc top; center image; 2 pairs left + 2 right, tight to image, no overlap",
    example:
      '{ "visual": "spotlight", "heading": "Product that leads", "points": ["One short promise under the title."], "palette": "ocean", "imageQuery": "product on stage", "cards": [{"title":"Clarity","body":"Short label, no filler."},{"title":"Pace","body":"Scan hierarchy fast."},{"title":"Trust","body":"Named sources, proof."},{"title":"Focus","body":"One idea, four points."}], "kicker": "SPOTLIGHT" }',
    tags: ["photo", "features", "grid", "product"],
    fields: [
      f.layout("spotlight"),
      {
        name: "palette",
        required: true,
        in: "frontmatter",
        type: "cream|ink|auto|ocean|forest|slate|amber|wine|neon|sunset|candy|volt",
        expects: "Model picks slide background color pack — do not omit",
      },
      f.image(),
      f.kicker(`2–5 short words, ALL CAPS (≤${SPOTLIGHT_CONTENT_LIMITS.maxKickerChars} chars)`),
      f.items(
        `exactly ${SPOTLIGHT_CONTENT_LIMITS.pairCount}`,
        `YAML items: [{title, body}] — never use cards: as key. title ≤${SPOTLIGHT_CONTENT_LIMITS.maxPairTitleChars} chars; body ≤${SPOTLIGHT_CONTENT_LIMITS.maxPairBodyChars} chars`,
      ),
      f.h1(
        `≤${SPOTLIGHT_CONTENT_LIMITS.maxH1Chars} chars (≈2–8 words)`,
        "Title only as H1; description is next paragraph",
      ),
      {
        name: "description",
        required: true,
        in: "body",
        type: "1 short paragraph under H1",
        expects: "Map outline.points[0] → paragraph under H1; no bullets",
        limit: `≤${SPOTLIGHT_CONTENT_LIMITS.maxDescChars} chars`,
      },
      {
        name: "items[].title",
        required: true,
        in: "frontmatter",
        type: "string",
        expects: "Pair title on left/right of center image",
        limit: `≤${SPOTLIGHT_CONTENT_LIMITS.maxPairTitleChars} chars`,
      },
      {
        name: "items[].body",
        required: true,
        in: "frontmatter",
        type: "string",
        expects: "Pair body under title",
        limit: `≤${SPOTLIGHT_CONTENT_LIMITS.maxPairBodyChars} chars`,
      },
    ],
  },
  {
    id: "pie",
    summary: "Title + description left; SVG pie chart with legend right",
    whenToUse:
      "Market share, composition, mix of 3–5 parts with numbers that sum to ~100%",
    antiPatterns: "2 slices or 6+; long labels; narrative without numbers (use cards/features)",
    outlineFields:
      "visual=pie; pie[{label,value}] 3–5; points[0]=description; chartTitle; kicker?",
    frontmatter:
      "layout: pie; chartTitle?; items: (from pie); kicker?",
    body: "H1 + one description paragraph (no bullets)",
    displays: "Left copy; right card with pie + % labels + legend",
    example:
      '{ "visual": "pie", "heading": "Comparing the Top Languages", "points": ["Python leads professional market share."], "chartTitle": "TIOBE Index Market Share", "pie": [{"label":"Python","value":38},{"label":"C++","value":21},{"label":"C","value":19},{"label":"Java","value":16},{"label":"JavaScript","value":6}], "kicker": "DATA" }',
    tags: ["number", "kpi", "compare", "chart"],
    fields: [
      f.layout("pie"),
      f.kicker(`2–5 short words, ALL CAPS (≤${PIE_CONTENT_LIMITS.maxKickerChars} chars)`),
      {
        name: "chartTitle",
        required: false,
        in: "frontmatter",
        type: "string",
        expects: "Short title above the pie",
        limit: `≤${PIE_CONTENT_LIMITS.maxChartTitleChars} chars`,
      },
      f.items(
        `${PIE_CONTENT_LIMITS.minSlices}–${PIE_CONTENT_LIMITS.maxSlices} slices`,
        `YAML items: [{label, value}] — never use pie: as key. label ≤${PIE_CONTENT_LIMITS.maxLabelChars} chars; value > 0 (normalized to %)`,
      ),
      f.h1(
        `≤${PIE_CONTENT_LIMITS.maxH1Chars} chars`,
        "Title as H1; description is next paragraph",
      ),
      {
        name: "description",
        required: true,
        in: "body",
        type: "1 short paragraph under H1",
        expects: "Map outline.points[0] → paragraph under H1; no bullets",
        limit: `≤${PIE_CONTENT_LIMITS.maxDescChars} chars`,
      },
      {
        name: "items[].label",
        required: true,
        in: "frontmatter",
        type: "string",
        expects: "Slice legend label",
        limit: `≤${PIE_CONTENT_LIMITS.maxLabelChars} chars`,
      },
      {
        name: "items[].value",
        required: true,
        in: "frontmatter",
        type: "number",
        expects: "Positive share weight; values are normalized to 100% for drawing",
        limit: "> 0",
      },
    ],
  },
];

export function layoutCatalogById(id: string): LayoutCatalogEntry | undefined {
  return LAYOUT_CATALOG.find((e) => e.id === id);
}

export function layoutList(tag?: string): Array<Pick<LayoutCatalogEntry, "id" | "summary" | "whenToUse" | "outlineFields" | "tags">> {
  const rows = tag
    ? LAYOUT_CATALOG.filter((e) => e.tags.includes(tag.trim().toLowerCase()))
    : LAYOUT_CATALOG;
  return rows.map(({ id, summary, whenToUse, outlineFields, tags }) => ({
    id,
    summary,
    whenToUse,
    outlineFields,
    tags,
  }));
}

export function layoutGet(id: string): LayoutCatalogEntry {
  const entry = layoutCatalogById(id.trim());
  if (!entry) {
    throw new Error(`Unknown layout id: ${id}. Use layout-list.`);
  }
  return entry;
}

export type LayoutMatchInput = {
  intent: string;
  hasNumbers?: boolean;
  hasSteps?: boolean;
  wantsPhoto?: boolean;
  featureCount?: number;
};

export type LayoutMatchHit = { id: string; score: number; reason: string };

export function layoutMatch(input: LayoutMatchInput): LayoutMatchHit[] {
  const intent = (input.intent || "").toLowerCase();
  const scores = new Map<string, { score: number; reasons: string[] }>();

  const bump = (id: string, n: number, reason: string) => {
    const cur = scores.get(id) ?? { score: 0, reasons: [] };
    cur.score += n;
    cur.reasons.push(reason);
    scores.set(id, cur);
  };

  if (input.wantsPhoto) {
    bump("image-right", 5, "wantsPhoto");
    bump("image-left", 4, "wantsPhoto");
    bump("hero", 3, "wantsPhoto open");
  }
  if (input.hasNumbers) {
    bump("stats", 5, "hasNumbers");
    bump("fact", 4, "hasNumbers single KPI");
  }
  if (input.hasSteps) {
    bump("process", 5, "hasSteps pipeline");
    bump("timeline", 4, "hasSteps roadmap");
  }
  if ((input.featureCount ?? 0) >= 3) {
    bump("features", 6, "featureCount≥3 with icons");
    bump("cards", 3, "featureCount≥3 cards");
  } else if ((input.featureCount ?? 0) === 2) {
    bump("cards", 5, "featureCount=2");
    bump("two-cols", 3, "pair compare");
  }

  if (/quote|голос|цитат|testimonial|proverb/.test(intent)) bump("quote", 6, "intent voice");
  if (/close|итог|манифест|takeaway|closing/.test(intent)) bump("statement", 6, "intent close");
  if (/compare|vs|versus|против|сравн/.test(intent)) bump("two-cols", 5, "intent compare");
  if (/skill|стек|stack|профиц/.test(intent)) bump("skills", 5, "intent skills");
  if (/icon|idea|концепт|идея/.test(intent)) bump("icon", 4, "intent concept");
  if (/pipeline|flow|как мы|процесс|how we/.test(intent)) bump("process", 5, "intent flow");
  if (/roadmap|истор|timeline|фаз/.test(intent)) bump("timeline", 5, "intent timeline");
  if (/stat|метрик|kpi|цифр/.test(intent)) bump("stats", 4, "intent metrics");
  if (/pillar|преимущ|benefit|feature/.test(intent)) bump("features", 4, "intent features");
  if (/spotlight|product shot|центр.*фото|product showcase|флагман/.test(intent)) {
    bump("spotlight", 6, "intent spotlight product");
  }
  if (input.wantsPhoto && (input.featureCount ?? 0) === 4) {
    bump("spotlight", 7, "photo + 4 feature pairs");
  }
  if (/pie|доля|market share|composition|mix|распредел|сегмент/.test(intent)) {
    bump("pie", 6, "intent pie / share mix");
  }
  if (input.hasNumbers && (input.featureCount ?? 0) >= 3 && (input.featureCount ?? 0) <= 5) {
    bump("pie", 4, "numbers + 3–5 parts");
  }

  const hits: LayoutMatchHit[] = [...scores.entries()]
    .map(([id, v]) => ({ id, score: v.score, reason: v.reasons.join("; ") }))
    .sort((a, b) => b.score - a.score);

  if (hits.length === 0) {
    return [
      { id: "image-right", score: 1, reason: "default photo story" },
      { id: "cards", score: 1, reason: "default structured" },
      { id: "two-cols", score: 1, reason: "default compare/list" },
    ];
  }
  return hits.slice(0, 5);
}
