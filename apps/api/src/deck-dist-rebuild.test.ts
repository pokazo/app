import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rebuildStaleDeckDist } from "./deck-dist-rebuild.js";

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
});
