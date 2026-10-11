import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  hasUploadImages,
  persistDeckUploads,
  uploadDirForDeck,
  UPLOAD_MAX_BYTES,
} from "./upload-store.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

function fakeFile(name: string, type: string, bytes: Uint8Array) {
  return {
    name,
    type,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

describe("upload-store", () => {
  it("rejects unsafe deck ids", () => {
    expect(() => uploadDirForDeck("/tmp/uploads", "../x")).toThrow(/unsafe/);
  });

  it("persists jpeg/png under deck folder with manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "pokazo-up-"));
    dirs.push(root);
    const deckId = "11111111-1111-4111-8111-111111111111";
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2]);
    const manifest = await persistDeckUploads({
      uploadRoot: root,
      deckId,
      files: [
        fakeFile("cat.png", "image/png", png),
        fakeFile("evil.exe", "application/octet-stream", new Uint8Array([1, 2, 3])),
      ],
    });
    expect(manifest.files).toHaveLength(1);
    expect(manifest.files[0]!.storedName).toBe("up-001.png");
    expect(hasUploadImages(root, deckId)).toBe(true);
    const raw = await readFile(join(root, deckId, "manifest.json"), "utf8");
    expect(JSON.parse(raw).files[0].originalName).toBe("cat.png");
  });

  it("skips oversized files", async () => {
    const root = await mkdtemp(join(tmpdir(), "pokazo-up-"));
    dirs.push(root);
    const deckId = "22222222-2222-4222-8222-222222222222";
    const big = new Uint8Array(UPLOAD_MAX_BYTES + 1);
    const manifest = await persistDeckUploads({
      uploadRoot: root,
      deckId,
      files: [fakeFile("big.jpg", "image/jpeg", big)],
    });
    expect(manifest.files).toHaveLength(0);
  });
});
