import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  FILMSTRIP_CAPTURE_H,
  FILMSTRIP_CAPTURE_W,
  FILMSTRIP_THUMB_HEIGHT,
  FILMSTRIP_THUMB_WIDTH,
  pngToFilmstripWebp,
} from "./slide-capture.js";

describe("slide-capture filmstrip encode", () => {
  it("uses 1:1 Slidev canvas viewport constants", () => {
    expect(FILMSTRIP_CAPTURE_W).toBe(980);
    expect(FILMSTRIP_CAPTURE_H).toBe(Math.round(980 / (16 / 9)));
    expect(FILMSTRIP_THUMB_HEIGHT).toBe(225);
  });

  it("downscales capture PNG to 16:9 thumb without upscaling", async () => {
    const png = await sharp({
      create: {
        width: FILMSTRIP_CAPTURE_W,
        height: FILMSTRIP_CAPTURE_H,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();
    const webp = await pngToFilmstripWebp(png);
    const meta = await sharp(webp).metadata();
    expect(meta.width).toBe(FILMSTRIP_THUMB_WIDTH);
    expect(meta.height).toBe(FILMSTRIP_THUMB_HEIGHT);
  });
});
