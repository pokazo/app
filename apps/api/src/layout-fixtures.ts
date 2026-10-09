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
---

# 3× faster delivery

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

export function badStatsMarkdown(): string {
  return `---
theme: default
title: "Bad stats"
---

---
layout: stats
items:
  - value: "1"
    label: Only
---

# Broken stats
`;
}
