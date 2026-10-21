import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withDeckDistLock } from "./deck-dist-lock.js";
import { rebuildStaleDeckDist } from "./deck-dist-rebuild.js";
import { buildSlidev } from "./slidev.js";

vi.mock("./slidev.js", () => ({
  buildSlidev: vi.fn(async () => {
    throw new Error("slidev build should not start while a dist edit holds the lock");
  }),
  deckServeBase: (id: string) => `/p/${id}/`,
}));

const dirs: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("rebuildStaleDeckDist", () => {
  it("returns without a slidev build when dist is already newer than slides.md", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pk-dist-"));
    dirs.push(dir);
    await mkdir(join(dir, "dist"), { recursive: true });
    const md = join(dir, "slides.md");
    const index = join(dir, "dist", "index.html");
    await writeFile(md, "# Hi\n", "utf8");
    await writeFile(index, "<html>built</html>", "utf8");
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    await utimes(md, past, past);
    await utimes(index, future, future);
    const t0 = Date.now();
    await rebuildStaleDeckDist("not-a-deck", dir);
    expect(Date.now() - t0).toBeLessThan(1000);
    const { readFile } = await import("node:fs/promises");
    expect(await readFile(index, "utf8")).toBe("<html>built</html>");
  });

  it("does not restore pre-insert thumbs over a shift that owns the dist lock", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pk-dist-lock-"));
    dirs.push(dir);
    const deckId = "deck-lock-insert";
    await mkdir(join(dir, "dist", "thumbs", "v2"), { recursive: true });
    const md = join(dir, "slides.md");
    const index = join(dir, "dist", "index.html");
    const thumb = (n: number) => join(dir, "dist", "thumbs", "v2", `${n}.webp`);
    await writeFile(md, "# inserted\n", "utf8");
    await writeFile(index, "<html>old</html>", "utf8");
    await writeFile(thumb(1), "A");
    await writeFile(thumb(2), "B");
    await writeFile(thumb(3), "C");
    const past = new Date(Date.now() - 60_000);
    const mdTime = new Date(Date.now() - 1_000);
    await utimes(index, past, past);
    await utimes(md, mdTime, mdTime);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let holding = false;
    const structure = withDeckDistLock(deckId, async () => {
      holding = true;
      await gate;
      await writeFile(thumb(1), "A");
      await writeFile(thumb(3), "B");
      await writeFile(thumb(4), "C");
      const { unlink } = await import("node:fs/promises");
      await unlink(thumb(2)).catch(() => {});
      await writeFile(index, "<html>structure</html>", "utf8");
      const future = new Date(Date.now() + 60_000);
      await utimes(index, future, future);
    });
    await vi.waitFor(() => {
      expect(holding).toBe(true);
    });

    const rebuildP = rebuildStaleDeckDist(deckId, dir);
    await new Promise((r) => setTimeout(r, 50));
    expect(vi.mocked(buildSlidev)).not.toHaveBeenCalled();
    release();
    await structure;
    await rebuildP;

    const { readFile } = await import("node:fs/promises");
    const { existsSync } = await import("node:fs");
    expect(await readFile(thumb(1), "utf8")).toBe("A");
    expect(existsSync(thumb(2))).toBe(false);
    expect(await readFile(thumb(3), "utf8")).toBe("B");
    expect(await readFile(thumb(4), "utf8")).toBe("C");
    expect(vi.mocked(buildSlidev)).not.toHaveBeenCalled();
  });
});
