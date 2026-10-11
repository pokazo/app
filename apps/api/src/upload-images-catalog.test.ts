import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { uploadImageSearch, uploadImageList } from "./upload-images-catalog.js";
import type { UploadIndex } from "./upload-index.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function fixtureIndex(files: UploadIndex["files"]) {
  const dir = await mkdtemp(join(tmpdir(), "pokazo-upidx-"));
  dirs.push(dir);
  await mkdir(dir, { recursive: true });
  const index: UploadIndex = { deckId: "d", files };
  await writeFile(join(dir, "index.json"), JSON.stringify(index), "utf8");
  return dir;
}

describe("upload-images-catalog", () => {
  it("ranks by caption/filename tokens", async () => {
    const dir = await fixtureIndex([
      {
        id: "up-001",
        storedName: "up-001.jpg",
        originalName: "beach.jpg",
        mime: "image/jpeg",
        caption: "Sunny beach with palm trees",
        tokens: ["sunny", "beach", "with", "palm", "trees"],
      },
      {
        id: "up-002",
        storedName: "up-002.jpg",
        originalName: "office.jpg",
        mime: "image/jpeg",
        caption: "Modern office workspace",
        tokens: ["modern", "office", "workspace"],
      },
    ]);
    const { hits, suggestedId } = await uploadImageSearch(dir, "beach palms", 5);
    expect(hits[0]!.id).toBe("up-001");
    expect(suggestedId).toBe("up-001");
    const list = await uploadImageList(dir);
    expect(list).toHaveLength(2);
  });

  it("returns files when query has no token overlap", async () => {
    const dir = await fixtureIndex([
      {
        id: "up-001",
        storedName: "up-001.jpg",
        originalName: "a.jpg",
        mime: "image/jpeg",
        caption: "Red car",
        tokens: ["red", "car"],
      },
    ]);
    const { hits } = await uploadImageSearch(dir, "zzzqqq", 3);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.id).toBe("up-001");
  });
});
