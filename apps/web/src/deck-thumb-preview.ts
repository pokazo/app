import { embedSlideUrl } from "./deck-view";

/**
 * What the filmstrip thumb shows before / after the Slidev iframe is ready.
 * Bare cover images look like “photo, no text” — heading must stay visible until iframe paints.
 */
export function thumbPlaceholderLayers(opts: {
  ready: boolean;
  heading: string;
  imageUrl?: string | null;
}): { showHeading: boolean; showImage: boolean; label: string } {
  const label = opts.heading.trim() || "Слайд";
  if (opts.ready) return { showHeading: false, showImage: false, label };
  return {
    showHeading: true,
    showImage: Boolean(opts.imageUrl),
    label,
  };
}

/** Cache-bust Slidev thumb URL when preview dist rebuilds — without remounting React state. */
export function thumbEmbedSrc(embedBase: string, index: number, cacheKey = 0): string {
  const base = embedSlideUrl(embedBase, index);
  return cacheKey > 0 ? `${base}&_r=${cacheKey}` : base;
}

/**
 * Progressive slide growth remounts the stage; thumbs stay keyed by index only
 * so existing iframes are not wiped back to the image placeholder.
 */
export function thumbReactKey(index: number): string {
  return `thumb-${index}`;
}

/** When dist cache key changes, drop ready so the new iframe can paint (heading stays). */
export function thumbShouldResetReady(prevCacheKey: number, nextCacheKey: number): boolean {
  return prevCacheKey !== nextCacheKey;
}
