import { useEffect, useRef, useState } from "react";
import {
  thumbEmbedSrc,
  thumbPlaceholderLayers,
  thumbShouldMountIframe,
  thumbShouldResetReady,
} from "../deck-thumb-preview";

const HOVER_UNMOUNT_MS = 200;

/** Scaled Slidev slide preview — iframe only for active / hover; else light cover thumb. */
export function DeckThumbPreview(props: {
  embedBase: string;
  index: number;
  heading: string;
  imageUrl?: string | null;
  enabled: boolean;
  /** Selected filmstrip page — mounts iframe for a live preview. */
  active?: boolean;
  /** Bumps when preview dist rebuilds — refreshes iframe without remounting the thumb. */
  embedCacheKey?: number;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const cacheKey = props.embedCacheKey ?? 0;
  const cacheKeyRef = useRef(cacheKey);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);
  const [ready, setReady] = useState(false);
  const active = Boolean(props.active);

  useEffect(() => {
    if (thumbShouldResetReady(cacheKeyRef.current, cacheKey)) {
      cacheKeyRef.current = cacheKey;
      setReady(false);
    }
  }, [cacheKey]);

  // Frame has pointer-events:none (CSS) so hover must bind on the parent .deck-thumb button.
  useEffect(() => {
    const host = rootRef.current?.closest(".deck-thumb");
    if (!(host instanceof HTMLElement)) return;
    const onEnter = () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      setHovered(true);
    };
    const onLeave = () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => setHovered(false), HOVER_UNMOUNT_MS);
    };
    host.addEventListener("mouseenter", onEnter);
    host.addEventListener("mouseleave", onLeave);
    host.addEventListener("focusin", onEnter);
    host.addEventListener("focusout", onLeave);
    return () => {
      host.removeEventListener("mouseenter", onEnter);
      host.removeEventListener("mouseleave", onLeave);
      host.removeEventListener("focusin", onEnter);
      host.removeEventListener("focusout", onLeave);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const mountIframe = thumbShouldMountIframe({
    enabled: props.enabled,
    active,
    hovered,
  });

  useEffect(() => {
    if (!mountIframe) setReady(false);
  }, [mountIframe]);

  const layers = thumbPlaceholderLayers({
    ready: ready && mountIframe,
    heading: props.heading || `Слайд ${props.index}`,
    imageUrl: props.imageUrl,
  });

  return (
    <span ref={rootRef} className="deck-thumb-frame" aria-hidden>
      {!ready || !mountIframe ? (
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
      {mountIframe ? (
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
