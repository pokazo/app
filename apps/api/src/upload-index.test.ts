import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureUploadIndex, tokenizeForSearch } from "./upload-index.js";
import type { UploadManifest } from "./upload-store.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("tokenizeForSearch", () => {
  it("splits unicode words", () => {
    expect(tokenizeForSearch("УАЗ Патриот внедорожник")).toContain("уаз");
    expect(tokenizeForSearch("palm-trees.jpg")).toContain("palm");
  });
});

describe("ensureUploadIndex", () => {
  it("captions via injected fn and is idempotent", async () => {
    const root = await mkdtemp(join(tmpdir(), "pokazo-idx-"));
    dirs.push(root);
    const deckId = "33333333-3333-4333-8333-333333333333";
    const dir = join(root, deckId);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dir, { recursive: true });
    const manifest: UploadManifest = {
      deckId,
      files: [
        {
          id: "up-001",
          originalName: "car.jpg",
          storedName: "up-001.jpg",
          mime: "image/jpeg",
          bytes: 3,
          uploadedAt: new Date().toISOString(),
        },
      ],
    };
    await writeFile(join(dir, "up-001.jpg"), Buffer.from([1, 2, 3]));
    await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest), "utf8");

    let calls = 0;
    const first = await ensureUploadIndex({
      uploadRoot: root,
      deckId,
      apiKey: "",
      apiBase: "http://example",
      caption: async () => {
        calls += 1;
        return "Blue sports car on a road";
      },
    });
    expect(first?.files[0]?.caption).toMatch(/Blue sports car/);
    expect(calls).toBe(1);

    const second = await ensureUploadIndex({
      uploadRoot: root,
      deckId,
      apiKey: "",
      apiBase: "http://example",
      caption: async () => {
        calls += 1;
        return "should not run";
      },
    });
    expect(calls).toBe(1);
    expect(second?.files[0]?.caption).toMatch(/Blue sports car/);
    const raw = JSON.parse(await readFile(join(dir, "index.json"), "utf8"));
    expect(raw.files[0].tokens).toContain("car");
  });
});
