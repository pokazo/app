import { useEffect, useRef, useState } from "react";
import {
  thumbEmbedSrc,
  thumbPlaceholderLayers,
  thumbShouldResetReady,
} from "../deck-thumb-preview";

/** Scaled Slidev slide preview — mounts iframe only when near the filmstrip viewport. */
export function DeckThumbPreview(props: {
  embedBase: string;
  index: number;
  heading: string;
  imageUrl?: string | null;
  enabled: boolean;
  /** Bumps when preview dist rebuilds — refreshes iframe without remounting the thumb. */
  embedCacheKey?: number;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const cacheKey = props.embedCacheKey ?? 0;
  const cacheKeyRef = useRef(cacheKey);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (thumbShouldResetReady(cacheKeyRef.current, cacheKey)) {
      cacheKeyRef.current = cacheKey;
      setReady(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!props.enabled) return;
    const el = rootRef.current;
    if (!el) return;
    const root = el.closest(".deck-thumbs");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { root: root instanceof Element ? root : null, rootMargin: "120px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [props.enabled]);

  const layers = thumbPlaceholderLayers({
    ready,
    heading: props.heading || `Слайд ${props.index}`,
    imageUrl: props.imageUrl,
  });

  return (
    <span ref={rootRef} className="deck-thumb-frame" aria-hidden>
      {!ready ? (
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
      ) : null}
      {props.enabled && visible ? (
        <span className="deck-thumb-scaler">
          <iframe
            title=""
            tabIndex={-1}
            src={thumbEmbedSrc(props.embedBase, props.index, cacheKey)}
            onLoad={() => setReady(true)}
          />
        </span>
      ) : null}
      <span className="deck-thumb-n">{props.index}</span>
    </span>
  );
}
