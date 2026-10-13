/**
 * Filmstrip shows a static slide screenshot (`/thumbs/N.webp`) when available.
 * Cover photo is a weak fallback — heading stays visible so thumbs are not “photo only”.
 */
export function thumbPlaceholderLayers(opts: {
  heading: string;
  imageUrl?: string | null;
}): { showHeading: boolean; showImage: boolean; label: string } {
  const label = opts.heading.trim() || "Слайд";
  const isSlideShot = Boolean(opts.imageUrl?.includes("/thumbs/"));
  if (isSlideShot) {
    return { showHeading: false, showImage: true, label };
  }
  return {
    showHeading: true,
    showImage: Boolean(opts.imageUrl),
    label,
  };
}

/**
 * Progressive slide growth remounts the stage; thumbs stay keyed by index only.
 */
export function thumbReactKey(index: number): string {
  return `thumb-${index}`;
}

/** Prefer filmstrip screenshot / cover thumb; fall back to full cover path. */
export function thumbCoverPath(opts: {
  imageThumb?: string | null;
  image?: string | null;
}): string | null {
  return opts.imageThumb || opts.image || null;
}

/** True when URL is a post-build slide raster under /thumbs/. */
export function thumbIsSlideShot(url?: string | null): boolean {
  return Boolean(url?.includes("/thumbs/"));
}
