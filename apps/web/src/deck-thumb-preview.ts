/**
 * Filmstrip shows a static slide screenshot (`/thumbs/…` or `/thumbs/v2/…`) when available.
 * No heading text in the cell — blank frame until the backend shot exists.
 */
export function thumbPlaceholderLayers(opts: {
  heading: string;
  imageUrl?: string | null;
}): { showHeading: boolean; showImage: boolean; label: string } {
  const label = opts.heading.trim() || "Слайд";
  return {
    showHeading: false,
    showImage: thumbIsSlideShot(opts.imageUrl),
    label,
  };
}

/**
 * Filmstrip cells follow the thumb file, not the slot index.
 * A reorder renumbers the slot but keeps the already painted webp.
 */
export function thumbReactKey(index: number, imageThumb?: string | null): string {
  const path = imageThumb?.split("?")[0]?.trim();
  return path ? `thumb-${path}` : `thumb-${index}`;
}

/** Only backend slide screenshots — never full cover `image`. */
export function thumbCoverPath(opts: {
  imageThumb?: string | null;
  image?: string | null;
}): string | null {
  return opts.imageThumb || null;
}

/** True when URL is a post-build slide raster under /thumbs/ (v1 or v2). */
export function thumbIsSlideShot(url?: string | null): boolean {
  return Boolean(url?.includes("/thumbs/"));
}
