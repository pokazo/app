import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  THUMB_WIDTH,
  thumbVariantBasename,
  thumbVariantPath,
  writeImageThumb,
} from "./image-variants.js";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("thumbVariantBasename / path", () => {
  it("maps cover basename to .thumb.webp", () => {
    expect(thumbVariantBasename("slide-1.jpg")).toBe("slide-1.thumb.webp");
    expect(thumbVariantBasename("/slide-4-abc123def0.png")).toBe("slide-4-abc123def0.thumb.webp");
    expect(thumbVariantBasename("slide-1.thumb.webp")).toBe("slide-1.thumb.webp");
  });

  it("derives local thumb path from image frontmatter path", () => {
    expect(thumbVariantPath("/slide-1.jpg")).toBe("/slide-1.thumb.webp");
    expect(thumbVariantPath(null)).toBe(null);
    expect(thumbVariantPath("https://x/y.jpg")).toBe(null);
  });
});

describe("writeImageThumb", () => {
  it("writes a smaller WebP sibling", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-thumb-"));
    await mkdir(join(dir, "public"), { recursive: true });
    const src = join(dir, "public", "slide-1.png");
    const wide = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 40, g: 80, b: 120 } },
    })
      .png()
      .toBuffer();
    await writeFile(src, wide);

    const out = await writeImageThumb(src);
    expect(out).toBe(join(dir, "public", "slide-1.thumb.webp"));
    const meta = await sharp(out!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(THUMB_WIDTH);
    expect((await readFile(out!)).byteLength).toBeLessThan(wide.byteLength);
  });

  it("does not enlarge tiny sources", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-thumb-tiny-"));
    const src = join(dir, "tiny.png");
    await writeFile(src, TINY_PNG);
    const out = await writeImageThumb(src);
    expect(out).toBeTruthy();
    const meta = await sharp(out!).metadata();
    expect(meta.width).toBe(1);
  });

  it("returns null for garbage bytes without throwing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-thumb-bad-"));
    const src = join(dir, "slide-1.jpg");
    await writeFile(src, Buffer.from("not-an-image"));
    await expect(writeImageThumb(src)).resolves.toBe(null);
  });
});
