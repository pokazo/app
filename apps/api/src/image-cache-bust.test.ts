import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bustSlideImageCache,
  contentHashHex,
  isVersionedImageBasename,
  replaceNthSlideImage,
  versionedImageBasename,
} from "./image-cache-bust.js";

describe("versionedImageBasename", () => {
  it("appends content hash", () => {
    expect(versionedImageBasename("slide-4.jpg", "abc123def0")).toBe("slide-4-abc123def0.jpg");
  });

  it("replaces a previous hash suffix", () => {
    expect(versionedImageBasename("slide-4-deadbeef01.jpg", "abc123def0")).toBe(
      "slide-4-abc123def0.jpg",
    );
  });

  it("keeps -gen in the stem", () => {
    expect(versionedImageBasename("slide-1-gen.png", "abc123def0")).toBe(
      "slide-1-gen-abc123def0.png",
    );
  });
});

describe("isVersionedImageBasename", () => {
  it("detects hashed slide photos", () => {
    expect(isVersionedImageBasename("slide-4-abc123def0.jpg")).toBe(true);
    expect(isVersionedImageBasename("/slide-4.jpg")).toBe(false);
  });
});

describe("replaceNthSlideImage", () => {
  const md = `---
title: t
---

# H

---
layout: image-right
image: /slide-4.jpg
---

# Body
`;

  it("updates only the target slide image", () => {
    const out = replaceNthSlideImage(md, 2, "/slide-4-abc123def0.jpg");
    expect(out).toContain("image: /slide-4-abc123def0.jpg");
    expect(out).not.toMatch(/image: \/slide-4\.jpg/);
  });
});

describe("bustSlideImageCache", () => {
  it("renames public image and patches slides.md", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-bust-"));
    await mkdir(join(dir, "public"), { recursive: true });
    const bytes = Buffer.from("fake-jpeg-bytes-for-hash");
    await writeFile(join(dir, "public", "slide-4.jpg"), bytes);
    await writeFile(
      join(dir, "slides.md"),
      `---
title: t
---

# H

---
layout: image-right
image: /slide-4.jpg
---

# Body
`,
      "utf8",
    );

    const hash = contentHashHex(bytes);
    const result = await bustSlideImageCache({ workDir: dir, slidevIndex: 2 });
    expect(result.changed).toBe(true);
    expect(result.to).toBe(`/slide-4-${hash}.jpg`);

    const md = await readFile(join(dir, "slides.md"), "utf8");
    expect(md).toContain(`image: /slide-4-${hash}.jpg`);
    await expect(readFile(join(dir, "public", `slide-4-${hash}.jpg`))).resolves.toEqual(bytes);

    const again = await bustSlideImageCache({ workDir: dir, slidevIndex: 2 });
    expect(again.changed).toBe(false);
  });
});
