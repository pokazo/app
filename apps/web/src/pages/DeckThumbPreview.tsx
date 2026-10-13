import { useEffect } from "react";
import { thumbIsSlideShot, thumbPlaceholderLayers } from "../deck-thumb-preview";

/** Static filmstrip cell — slide screenshot WebP (or cover fallback). No Slidev iframe. */
export function DeckThumbPreview(props: {
  index: number;
  heading: string;
  imageUrl?: string | null;
  /** Kept for call-site compatibility; filmstrip no longer embeds Slidev. */
  embedBase?: string;
  enabled?: boolean;
  active?: boolean;
  embedCacheKey?: number;
}) {
  const layers = thumbPlaceholderLayers({
    heading: props.heading || `Слайд ${props.index}`,
    imageUrl: props.imageUrl,
  });
  const shot = thumbIsSlideShot(props.imageUrl);

  useEffect(() => {
    if (!props.imageUrl) return;
    console.info(
      `[filmstrip] slide=${props.index} src=${props.imageUrl.split("/").pop()} shot=${shot}`,
    );
  }, [props.index, props.imageUrl, shot]);

  return (
    <span className="deck-thumb-frame" aria-hidden data-thumb-shot={shot ? "1" : "0"}>
      <span className="deck-thumb-ph-wrap">
        {layers.showImage && props.imageUrl ? (
          <img
            className="deck-thumb-ph"
            src={props.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {layers.showHeading ? (
          <span className={layers.showImage ? "deck-thumb-ph-label" : "deck-thumb-fallback"}>
            {layers.label}
          </span>
        ) : null}
      </span>
      <span className="deck-thumb-n">{props.index}</span>
    </span>
  );
}
