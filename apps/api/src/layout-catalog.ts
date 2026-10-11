/** Source-of-truth descriptions for outline/compose layout selection (MCP). */

import { layoutCarbonIconHints } from "../slidev-layouts/layout-assert.js";

const ICON_HINTS = layoutCarbonIconHints();
const ICON_HINTS_FIELD = `iconHint ONLY from: ${ICON_HINTS.join(", ")}`;

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
  /** Allowed carbon-* iconHints for icon|features|process */
  iconHints?: string[];
};

export const LAYOUT_CATALOG: LayoutCatalogEntry[] = [
  {
    id: "hero",
    summary: "Opening brand slide with variant + optional photo",
    whenToUse: "Slide 1 / cover energy: brand promise, product shot, fullbleed mood",
    antiPatterns: "Mid-deck bullets; dense facts",
    outlineFields: "visual=hero|cover; imageQuery; kicker; points or long heading",
    frontmatter: "layout: hero; variant: ribbon|corner|inset|fullbleed|editorial|product; image: /local.png; kicker",
    body: "H1 + short promise line",
    displays: "Large title on cream/ink; photo for fullbleed/product",
    example: '{ "visual": "hero", "heading": "Pokazo", "points": ["Decks from a brief"], "imageQuery": "presentation stage", "kicker": "BRAND" }',
    tags: ["open", "photo", "brand"],
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
  },
  {
    id: "image-right",
    summary: "Text left, local photo right",
    whenToUse: "Concrete subject worth showing; narrative + photo",
    antiPatterns: "Abstract marketing with no real object for imageQuery",
    outlineFields: "visual=image-right; imageQuery; points≥1",
    frontmatter: "layout: image-right; image: /slide-N.jpg; kicker?",
    body: "H1 + bullets",
    displays: "Two columns: copy | photo",
    example: '{ "visual": "image-right", "heading": "On the factory floor", "points": ["Line A"], "imageQuery": "assembly line robots" }',
    tags: ["photo", "story"],
  },
  {
    id: "image-left",
    summary: "Local photo left, text right",
    whenToUse: "Same as image-right; vary photo side for rhythm",
    antiPatterns: "Same as image-right",
    outlineFields: "visual=image-left; imageQuery; points≥1",
    frontmatter: "layout: image-left; image: /slide-N.jpg",
    body: "H1 + bullets",
    displays: "Two columns: photo | copy",
    example: '{ "visual": "image-left", "heading": "In the field", "points": ["Detail"], "imageQuery": "field technician" }',
    tags: ["photo", "story"],
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
