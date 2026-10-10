import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
] as const;

export type LayoutShotName = (typeof LAYOUT_SHOT_ORDER)[number];

export function writeFixturePublicImage(workDir: string, filename = "slide-1.png"): string {
  const pub = join(workDir, "public");
  mkdirSync(pub, { recursive: true });
  writeFileSync(join(pub, filename), FIXTURE_PNG);
  return `/${filename}`;
}

export function happyPathLayoutsMarkdown(imagePath = "/slide-1.png"): string {
  // Headmatter doubles as slide-1 frontmatter (avoid an empty leading slide).
  return `---
theme: default
title: "Layout gallery"
layout: hero
variant: centered
image: ${imagePath}
kicker: BRAND
---

# Hero centered

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
kicker: ROADMAP
steps:
  - phase: Start
    title: Discover
    body: Research
    state: done
  - phase: Build
    title: Ship
    body: Release
    state: current
  - phase: Grow
    title: Scale
    body: Expand
    state: todo
---

# Timeline title

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
`;
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
};

export function badStatsMarkdown(): string {
  return BAD_LAYOUT_MARKDOWN.stats;
}

export function badMarkdownForLayout(layout: (typeof LAYOUT_SHOT_ORDER)[number]): string {
  return BAD_LAYOUT_MARKDOWN[layout];
}
