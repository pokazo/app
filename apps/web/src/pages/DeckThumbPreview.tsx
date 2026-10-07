import { useEffect, useRef, useState } from "react";
import { embedSlideUrl } from "../deck-view";

/** Scaled Slidev slide preview — mounts iframe only when near the filmstrip viewport. */
export function DeckThumbPreview(props: {
  embedBase: string;
  index: number;
  heading: string;
  imageUrl?: string | null;
  enabled: boolean;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

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

  return (
    <span ref={rootRef} className="deck-thumb-frame" aria-hidden>
      {!ready ? (
        props.imageUrl ? (
          <img className="deck-thumb-ph" src={props.imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="deck-thumb-fallback">{props.heading || `Слайд ${props.index}`}</span>
        )
      ) : null}
      {props.enabled && visible ? (
        <span className="deck-thumb-scaler">
          <iframe
            title=""
            tabIndex={-1}
            src={embedSlideUrl(props.embedBase, props.index)}
            onLoad={() => setReady(true)}
          />
        </span>
      ) : null}
      <span className="deck-thumb-n">{props.index}</span>
    </span>
  );
}
