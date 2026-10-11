import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createUploadImageUseTools } from "./upload-images-tools.js";
import type { UploadIndex } from "./upload-index.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("createUploadImageUseTools", () => {
  it("copies upload into workDir/public", async () => {
    const uploadDir = await mkdtemp(join(tmpdir(), "pokazo-use-up-"));
    const workDir = await mkdtemp(join(tmpdir(), "pokazo-use-work-"));
    dirs.push(uploadDir, workDir);
    await writeFile(join(uploadDir, "up-001.jpg"), Buffer.from("IMGDATA"));
    const index: UploadIndex = {
      deckId: "d",
      files: [
        {
          id: "up-001",
          storedName: "up-001.jpg",
          originalName: "photo.jpg",
          mime: "image/jpeg",
          caption: "A photo",
          tokens: ["photo"],
        },
      ],
    };
    await writeFile(join(uploadDir, "index.json"), JSON.stringify(index), "utf8");
    await mkdir(join(workDir, "public"), { recursive: true });

    const attrs: unknown[] = [];
    const tools = createUploadImageUseTools(workDir, uploadDir, {
      onAttribution: (e) => attrs.push(e),
    });
    const use = tools["upload-image-use"] as {
      execute: (args: { id: string; filename: string }) => Promise<Record<string, unknown>>;
    };
    const out = await use.execute({ id: "up-001", filename: "slide-2.jpg" });
    expect(out.path).toBe("/slide-2.jpg");
    expect(await readFile(join(workDir, "public", "slide-2.jpg"), "utf8")).toBe("IMGDATA");
    expect(attrs[0]).toMatchObject({ source: "upload", id: "up-001", originalName: "photo.jpg" });
  });
});
