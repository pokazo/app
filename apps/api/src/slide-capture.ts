import sharp from "sharp";

/** Slidev default canvas width (built decks use this unless frontmatter overrides). */
export const SLIDEV_CANVAS_W = 980;
export const SLIDEV_ASPECT = 16 / 9;
export const SLIDEV_CANVAS_H = Math.round(SLIDEV_CANVAS_W / SLIDEV_ASPECT);

/**
 * Filmstrip capture viewport = 1:1 slide canvas.
 * A wider viewport (e.g. 1280×720) scales the slide up and clips overflow — thumbs look
 * zoomed vs the editor stage, which usually fits the whole slide (scale ≤ 1).
 */
export const FILMSTRIP_CAPTURE_W = SLIDEV_CANVAS_W;
export const FILMSTRIP_CAPTURE_H = SLIDEV_CANVAS_H;

/** Filmstrip slot ~176 CSS px; 2× retina → ~400. */
export const FILMSTRIP_THUMB_WIDTH = 400;
export const FILMSTRIP_THUMB_HEIGHT = Math.round((FILMSTRIP_THUMB_WIDTH * 9) / 16);
export const FILMSTRIP_WEBP_QUALITY = 72;

/** Rasterize the scaled slide layer, not the outer letterboxed container. */
export const FILMSTRIP_CAPTURE_SELECTOR = "#slide-content";
export const FILMSTRIP_CAPTURE_READY_SELECTOR = "#slide-container";

export async function pngToFilmstripWebp(png: Buffer): Promise<Buffer> {
  return sharp(png)
    .resize(FILMSTRIP_THUMB_WIDTH, FILMSTRIP_THUMB_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: FILMSTRIP_WEBP_QUALITY })
    .toBuffer();
}
