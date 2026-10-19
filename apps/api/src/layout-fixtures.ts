import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { HERO_VARIANTS, type HeroVariant } from "./hero-skill.js";

/** 1×1 PNG — enough for image: frontmatter in visual tests */
export const FIXTURE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Stable order for goldens / gate tests */
export const LAYOUT_SHOT_ORDER = [
  "hero",
  "image-right",
  "image-left",
  "two-cols",
  "quote",
  "fact",
  "icon",
  "cards",
  "timeline",
  "stats",
  "skills",
  "statement",
  "features",
  "process",
  "spotlight",
  "pie",
  "agenda",
] as const;

export type LayoutShotName = (typeof LAYOUT_SHOT_ORDER)[number];

/** Golden names for each hero variant (separate from gallery `hero` = ribbon). */
export const HERO_VARIANT_SHOT_ORDER = HERO_VARIANTS.map(
  (v) => `hero-${v}` as const,
);
export type HeroVariantShotName = (typeof HERO_VARIANT_SHOT_ORDER)[number];

/** Half-and-half scene PNG so fullbleed / product / inset crop read differently. */
export function heroFixturePng(width = 640, height = 360): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      const left = x < width / 2;
      const band = Math.floor(y / (height / 6));
      if (left) {
        raw[i] = 40 + band * 12;
        raw[i + 1] = 90 + band * 18;
        raw[i + 2] = 140 + band * 10;
      } else {
        raw[i] = 200 - band * 8;
        raw[i + 1] = 110 + band * 10;
        raw[i + 2] = 55;
      }
    }
  }
  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    return table;
  })();
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const typeBuf = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  };
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function writeFixturePublicImage(workDir: string, filename = "slide-1.png"): string {
  const pub = join(workDir, "public");
  mkdirSync(pub, { recursive: true });
  writeFileSync(join(pub, filename), FIXTURE_PNG);
  return `/${filename}`;
}

export function writeHeroFixturePublicImage(
  workDir: string,
  filename = "slide-1.png",
): string {
  const pub = join(workDir, "public");
  mkdirSync(pub, { recursive: true });
  writeFileSync(join(pub, filename), heroFixturePng());
  return `/${filename}`;
}

/** One happy-path slide per hero variant — for golden screenshots. */
export function heroVariantsMarkdown(imagePath = "/slide-1.png"): string {
  const slides = HERO_VARIANTS.map((variant: HeroVariant, i) => {
    const head =
      i === 0
        ? `---
theme: default
title: "Hero variants"
layout: hero
variant: ${variant}
image: ${imagePath}
brand: Pokazo
kicker: HERO
---`
        : `---
layout: hero
variant: ${variant}
image: ${imagePath}
brand: Pokazo
kicker: HERO
---`;
    return `${head}

# ${variant[0]!.toUpperCase()}${variant.slice(1)} hero

One clear promise under the title.
`;
  });
  return slides.join("\n");
}

export function happyPathLayoutsMarkdown(imagePath = "/slide-1.png"): string {
  // Headmatter doubles as slide-1 frontmatter (avoid an empty leading slide).
  return `---
theme: default
title: "Layout gallery"
layout: hero
variant: ribbon
image: ${imagePath}
kicker: BRAND
---

# Hero ribbon

Promise line

---
layout: image-right
image: ${imagePath}
kicker: PHOTO
---

# Image right

- Point one
- Point two

---
layout: image-left
image: ${imagePath}
kicker: PHOTO
---

# Image left

- Point one
- Point two

---
layout: two-cols
kicker: COMPARE
---

# Two columns

::left::
- Left A
- Left B

::right::
- Right A
- Right B

---
layout: quote
kicker: VOICE
---

# Speed is a feature

- — Engineering proverb

---
layout: fact
kicker: FACT
source: Engineering benchmark
---

# 3× faster delivery

One metric. Full slide. No competing charts or bullets.

---
layout: icon
iconHint: carbon-idea
kicker: IDEA
---

# Icon slide

- Clear idea
- Short bullets

---
layout: cards
kicker: CARDS
items:
  - title: Alpha
    body: First card body
  - title: Beta
    body: Second card body
---

# Cards title

---
layout: timeline
kicker: ИСТОРИЯ
steps:
  - phase: 159 г. до н.э.
    title: Основание города
    body: Первое упоминание Анталии
    state: done
  - phase: Римская эпоха
    title: Античное наследие
    body: Памятники римской эпохи в городе
    state: done
  - phase: Византийская и сельджукская эпохи
    title: Средневековое наследие
    body: Архитектурные памятники тех эпох
    state: current
  - phase: 1972 г.
    title: Охрана старого города
    body: Калеичи признан памятником архитектуры
    state: todo
---

# Исторический путь Анталии

---
layout: stats
kicker: METRICS
items:
  - value: "42"
    label: Ships
    note: per quarter
  - value: "9"
    label: Teams
    note: active
---

# Stats title

---
layout: skills
kicker: STACK
items:
  - name: TypeScript
    level: Expert
    pct: 90
  - name: Vue
    level: Strong
    pct: 75
---

# Skills title

---
layout: statement
kicker: CLOSE
---

# Ship the sharp idea

Leave one clear takeaway — nothing competing for attention.

---
layout: features
kicker: PILLARS
items:
  - title: Clarity
    body: One idea per slide, short labels, no filler.
    iconHint: carbon-idea
  - title: Trust
    body: Named sources and concrete numbers.
    iconHint: carbon-security
  - title: Pace
    body: Fast scanning through hierarchy and space.
    iconHint: carbon-rocket
---

# Three pillars

---
layout: process
kicker: FLOW
steps:
  - title: Brief
    iconHint: carbon-document
  - title: Outline
    iconHint: carbon-list
  - title: Compose
    iconHint: carbon-paint-brush
  - title: Review
    iconHint: carbon-view
  - title: Ship
    iconHint: carbon-checkmark
---

# How we deliver

---
layout: spotlight
palette: ocean
image: ${imagePath}
kicker: SPOTLIGHT
items:
  - title: Clarity
    body: Short label, no filler.
  - title: Pace
    body: Scan hierarchy fast.
  - title: Trust
    body: Named sources, proof.
  - title: Focus
    body: One idea, four points.
---

# Product that leads

One short promise under the title.

---
layout: pie
kicker: DATA
chartTitle: TIOBE Index Market Share
items:
  - label: Python
    value: "38"
  - label: C++
    value: "21"
  - label: C
    value: "19"
  - label: Java
    value: "16"
  - label: JavaScript
    value: "6"
---

# Comparing the Top Languages

Python leads professional market share.

---
layout: agenda
palette: candy
kicker: AGENDA
items:
  - title: Core Principles
  - title: Enterprise Ecosystem
  - title: Global Reach
---

# The Power of Java

An introduction to the language that powers billions of devices.
`;
}

/** Multi-palette agenda deck for visual theme screenshots. */
export const AGENDA_PALETTE_SHOT_ORDER = [
  "cream",
  "ink",
  "ocean",
  "forest",
  "amber",
  "candy",
  "neon",
  "volt",
] as const;

function agendaSlideMarkdown(palette: string, includeHead = false): string {
  const head = includeHead
    ? `theme: default
title: "Agenda palettes"
`
    : "";
  return `---
${head}layout: agenda
palette: ${palette}
kicker: AGENDA
items:
  - title: Core Principles
  - title: Enterprise Ecosystem
  - title: Global Reach
---

# The Power of Java

An introduction to the language that powers billions of devices.
`;
}

export function agendaPalettesMarkdown(): string {
  const [first, ...rest] = AGENDA_PALETTE_SHOT_ORDER;
  return [
    agendaSlideMarkdown(first!, true),
    ...rest.map((p) => agendaSlideMarkdown(p)),
  ].join("\n");
}

function deckWithSlide(title: string, slideBody: string): string {
  return `---
theme: default
title: ${JSON.stringify(title)}
---

${slideBody.trim()}
`;
}

/** One undrawable slide per custom layout — assertLayoutsInMarkdown must throw LayoutError[<layout>]. */
export const BAD_LAYOUT_MARKDOWN: Record<
  (typeof LAYOUT_SHOT_ORDER)[number],
  string
> = {
  hero: deckWithSlide(
    "Bad hero",
    `---
layout: hero
variant: split
---

# Broken hero
`,
  ),
  "image-right": deckWithSlide(
    "Bad image-right",
    `---
layout: image-right
image: https://evil.example/x.jpg
---

# Broken image-right
`,
  ),
  "image-left": deckWithSlide(
    "Bad image-left",
    `---
layout: image-left
---

# Broken image-left
`,
  ),
  "two-cols": deckWithSlide(
    "Bad two-cols",
    `---
layout: two-cols
---

# Broken two-cols

::left::
- Only left
`,
  ),
  quote: deckWithSlide(
    "Bad quote",
    `---
layout: quote
---

No heading here
`,
  ),
  fact: deckWithSlide(
    "Bad fact",
    `---
layout: fact
---

just text
`,
  ),
  icon: deckWithSlide(
    "Bad icon",
    `---
layout: icon
---

# Broken icon
`,
  ),
  cards: deckWithSlide(
    "Bad cards",
    `---
layout: cards
items:
  - title: Only
    body: one card is not enough
---

# Broken cards
`,
  ),
  timeline: deckWithSlide(
    "Bad timeline",
    `---
layout: timeline
steps:
  - title: A
  - title: B
---

# Broken timeline
`,
  ),
  stats: deckWithSlide(
    "Bad stats",
    `---
layout: stats
items:
  - value: "1"
    label: Only
---

# Broken stats
`,
  ),
  skills: deckWithSlide(
    "Bad skills",
    `---
layout: skills
items:
  - name: Solo
    pct: 50
---

# Broken skills
`,
  ),
  statement: deckWithSlide(
    "Bad statement",
    `---
layout: statement
---

no heading
`,
  ),
  features: deckWithSlide(
    "Bad features",
    `---
layout: features
items:
  - title: Only
    iconHint: carbon-idea
---

# Broken features
`,
  ),
  process: deckWithSlide(
    "Bad process",
    `---
layout: process
steps:
  - title: A
    iconHint: carbon-idea
  - title: B
    iconHint: carbon-idea
---

# Broken process
`,
  ),
  spotlight: deckWithSlide(
    "Bad spotlight",
    `---
layout: spotlight
palette: ocean
items:
  - title: Only
    body: one pair
---

# Broken spotlight

Missing image and pairs.
`,
  ),
  pie: deckWithSlide(
    "Bad pie",
    `---
layout: pie
items:
  - label: Only
    value: "10"
---

# Broken pie

Need more slices.
`,
  ),
  agenda: deckWithSlide(
    "Bad agenda",
    `---
layout: agenda
palette: ocean
items:
  - title: Only
---

# Broken agenda

Need more rows.
`,
  ),
};

export function badStatsMarkdown(): string {
  return BAD_LAYOUT_MARKDOWN.stats;
}

export function badMarkdownForLayout(layout: (typeof LAYOUT_SHOT_ORDER)[number]): string {
  return BAD_LAYOUT_MARKDOWN[layout];
}
