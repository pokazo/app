import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countDeckSlides } from "./deck-export-render.js";

/** Leading hero plus every outline slide — the player lists outline+1 pages. */
const orphanHeroMd = `---
layout: hero
---

# Cover

---
layout: image-right
---

# One

---
layout: stats
---

# Two

---
layout: features
---

# Last
`;

describe("countDeckSlides", () => {
  it("counts the orphan leading hero so the last view slide is included", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-count-slides-"));
    await writeFile(
      join(dir, "outline.json"),
      JSON.stringify({ slides: [{ heading: "One" }, { heading: "Two" }, { heading: "Last" }] }),
      "utf8",
    );
    await writeFile(join(dir, "slides.md"), orphanHeroMd, "utf8");
    expect(await countDeckSlides(dir)).toBe(4);
  });

  it("stays on outline length when markdown matches the outline", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-count-slides-"));
    await writeFile(
      join(dir, "outline.json"),
      JSON.stringify({ slides: [{ heading: "A" }, { heading: "B" }] }),
      "utf8",
    );
    await writeFile(
      join(dir, "slides.md"),
      "---\nlayout: hero\n---\n\n# A\n\n---\nlayout: fact\n---\n\n# B\n",
      "utf8",
    );
    expect(await countDeckSlides(dir)).toBe(2);
  });
});
