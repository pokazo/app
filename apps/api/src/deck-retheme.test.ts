import { mkdtempSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { applyDeckTheme, gateDeckRetheme } from "./deck-retheme.js";

async function seedOceanDeck(workDir: string) {
  await writeFile(
    join(workDir, "input.json"),
    JSON.stringify({
      topic: "Demo",
      locale: "ru",
      slideCount: 3,
      audience: "general",
      theme: "ocean",
    }),
    "utf8",
  );
  await writeFile(
    join(workDir, "slides.md"),
    `---
theme: default
layout: hero
palette: ocean
---

# One

---
layout: spotlight
palette: candy
image: /slide-2.png
---

# Spot

---
layout: statement
palette: ocean
---

# Three
`,
    "utf8",
  );
}

describe("applyDeckTheme", () => {
  it("maps theme onto input.json and all slide palettes without calling rebuild hooks as LLM", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "pokazo-retheme-"));
    await seedOceanDeck(workDir);
    const persisted: string[] = [];
    const rebuild = vi.fn(async () => {});

    const result = await applyDeckTheme({
      id: "00000000-0000-4000-8000-000000000001",
      workDir,
      theme: "forest",
      onThemePersisted: async (theme) => {
        persisted.push(theme);
      },
      rebuild,
    });

    expect(result.theme).toBe("forest");
    expect(persisted).toEqual(["forest"]);
    expect(rebuild).toHaveBeenCalledOnce();

    const input = JSON.parse(await readFile(join(workDir, "input.json"), "utf8")) as {
      theme?: string;
    };
    expect(input.theme).toBe("forest");

    const md = await readFile(join(workDir, "slides.md"), "utf8");
    expect(md).toMatch(/^theme: default$/m);
    const blocks = [...md.matchAll(/^---\n([\s\S]*?)\n---/gm)].map((m) => m[1]!);
    expect(blocks).toHaveLength(3);
    for (const fm of blocks) {
      expect(fm).toMatch(/^palette: forest$/m);
    }
    expect(md).not.toMatch(/palette: candy/);
    expect(md).not.toMatch(/palette: ocean/);
  });

  it("rejects auto — retheme is a mapper, not theme-pick LLM", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "pokazo-retheme-auto-"));
    await seedOceanDeck(workDir);
    await expect(
      applyDeckTheme({
        id: "00000000-0000-4000-8000-000000000002",
        workDir,
        theme: "auto",
        rebuild: async () => {},
      }),
    ).rejects.toThrow(/auto|concrete|selectable/i);
  });
});

describe("gateDeckRetheme", () => {
  it("allows ready deck with concrete theme and no busy", () => {
    expect(
      gateDeckRetheme({
        deckStatus: "ready",
        hasSlides: true,
        busy: null,
        theme: "forest",
      }),
    ).toEqual({ ok: true, theme: "forest" });
  });

  it("rejects not-ready decks", () => {
    const g = gateDeckRetheme({
      deckStatus: "generating",
      hasSlides: true,
      busy: null,
      theme: "forest",
    });
    expect(g).toMatchObject({ ok: false, status: 409, error: "deck not ready" });
  });

  it("rejects busy decks", () => {
    const g = gateDeckRetheme({
      deckStatus: "ready",
      hasSlides: true,
      busy: "rewriting",
      theme: "forest",
    });
    expect(g).toMatchObject({ ok: false, status: 409, error: "busy", reason: "rewriting" });
  });

  it("rejects auto and unknown themes", () => {
    expect(
      gateDeckRetheme({
        deckStatus: "ready",
        hasSlides: true,
        busy: null,
        theme: "auto",
      }),
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      gateDeckRetheme({
        deckStatus: "ready",
        hasSlides: true,
        busy: null,
        theme: "nope",
      }),
    ).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects missing slides", () => {
    expect(
      gateDeckRetheme({
        deckStatus: "ready",
        hasSlides: false,
        busy: null,
        theme: "forest",
      }),
    ).toMatchObject({ ok: false, status: 404 });
  });
});
