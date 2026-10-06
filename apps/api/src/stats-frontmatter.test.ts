import { describe, expect, it } from "vitest";
import { normalizeStatsFrontmatter } from "./stats-frontmatter.js";
import { guardMarkdown } from "./md-guard.js";

describe("normalizeStatsFrontmatter", () => {
  it("renames stats: to items: on layout stats slides", () => {
    const md = `---
layout: stats
kicker: FACTS
stats:
  - value: "12+"
    label: years
    note: since 2012
---

# Numbers
`;
    const out = normalizeStatsFrontmatter(md);
    expect(out).toMatch(/^items:/m);
    expect(out).not.toMatch(/^stats:/m);
    expect(out).toMatch(/value: "12\+"/);
  });

  it("keeps items: when already present", () => {
    const md = `---
layout: stats
items:
  - value: "1"
    label: a
    note: b
---

# Ok
`;
    expect(normalizeStatsFrontmatter(md)).toBe(md);
  });

  it("does not touch non-stats layouts", () => {
    const md = `---
layout: timeline
stats:
  - value: "x"
---

# T
`;
    expect(normalizeStatsFrontmatter(md)).toBe(md);
  });

  it("runs inside guardMarkdown", () => {
    const out = guardMarkdown(
      `---
layout: stats
stats:
  - value: "9"
    label: cities
    note: RU
---

# Stats
`,
      "bricks",
    );
    expect(out).toMatch(/^items:/m);
    expect(out).not.toMatch(/^stats:/m);
  });
});
