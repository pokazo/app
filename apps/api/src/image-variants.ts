import { access, unlink } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import sharp from "sharp";

export const THUMB_WIDTH = 480;
export const THUMB_WEBP_QUALITY = 75;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const THUMB_SUFFIX = /\.thumb\.webp$/i;

/** `slide-1.jpg` → `slide-1.thumb.webp`; already-thumb → unchanged basename. */
export function thumbVariantBasename(filename: string): string {
  const base = basename(filename.replace(/^\//, ""));
  if (THUMB_SUFFIX.test(base)) return base;
  const ext = extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  return `${stem}.thumb.webp`;
}

/** Local path `/slide-1.jpg` → `/slide-1.thumb.webp`, or null if not a local image. */
export function thumbVariantPath(imagePath: string | null | undefined): string | null {
  if (!imagePath || !imagePath.startsWith("/")) return null;
  const base = basename(imagePath);
  if (!IMAGE_EXT.test(base) || THUMB_SUFFIX.test(base)) return null;
  return `/${thumbVariantBasename(base)}`;
}

export function thumbAbsPath(imageAbsPath: string): string {
  return join(dirname(imageAbsPath), thumbVariantBasename(imageAbsPath));
}

/**
 * Write a small WebP next to the source image for filmstrip placeholders.
 * No-op for non-images / already-thumb files. Overwrites existing thumb.
 */
export async function writeImageThumb(imageAbsPath: string): Promise<string | null> {
  const base = basename(imageAbsPath);
  if (!IMAGE_EXT.test(base) || THUMB_SUFFIX.test(base)) return null;
  try {
    await access(imageAbsPath);
  } catch {
    return null;
  }
  const out = thumbAbsPath(imageAbsPath);
  try {
    await sharp(imageAbsPath)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_WEBP_QUALITY })
      .toFile(out);
    return out;
  } catch {
    /* corrupt / unsupported — keep original; filmstrip falls back to full image */
    return null;
  }
}

/** Best-effort remove of a thumb sibling (e.g. after rename/bust). */
export async function removeImageThumb(imageAbsPath: string): Promise<void> {
  const base = basename(imageAbsPath);
  if (!IMAGE_EXT.test(base) || THUMB_SUFFIX.test(base)) return;
  try {
    await unlink(thumbAbsPath(imageAbsPath));
  } catch {
    /* missing is fine */
  }
}
