import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { apiUrl } from "../api";
import { embedDeckUrl, embedSlideUrl, slidevNavigateMessage } from "../deck-view";

type Me = { id: string; email: string; name: string };
type Slide = { index: number; heading: string };
type ViewMeta = {
  topic: string;
  slides: Slide[];
  embedBase: string;
};

export function DeckView() {
  const { id = "" } = useParams();
  const stageRef = useRef<HTMLIFrameElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meta, setMeta] = useState<ViewMeta | null>(null);
  const [err, setErr] = useState("");
  const [current, setCurrent] = useState(1);
  const [copied, setCopied] = useState(false);
  const [stageReady, setStageReady] = useState(false);

  const embedBase = apiUrl(`/p/${id}/`);

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (data?.email) setMe(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMeta(null);
    setErr("");
    setCurrent(1);
    setStageReady(false);
    fetch(apiUrl(`/api/view/${id}`), { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("not ready");
        return r.json() as Promise<ViewMeta>;
      })
      .then((data) => {
        setMeta(data);
        setCurrent(data.slides[0]?.index ?? 1);
      })
      .catch(() => setErr("Презентация ещё не готова или ссылка неверная."));
  }, [id]);

  const last = meta?.slides.length ?? 1;
  const go = useCallback(
    (n: number) => {
      setCurrent(Math.min(last, Math.max(1, n)));
    },
    [last],
  );

  useEffect(() => {
    if (!stageReady) return;
    stageRef.current?.contentWindow?.postMessage(slidevNavigateMessage(current), "*");
  }, [current, stageReady]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        go(current + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(current - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go]);

  useEffect(() => {
    document.querySelector(`[data-thumb="${current}"]`)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [current]);

  async function onOut() {
    await fetch(apiUrl("/api/auth/sign-out"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setMe(null);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const slides = meta?.slides ?? [];

  return (
    <div className="deck-shell">
      <PkHeader me={me} onOut={me ? onOut : undefined} />
      <div className="deck-toolbar wrap">
        <p className="deck-title">{meta?.topic || "Презентация"}</p>
        <div className="deck-toolbar-actions">
          {meta ? (
            <span className="deck-pos">
              {current} / {last}
            </span>
          ) : null}
          <button type="button" className="pk ghost" onClick={() => void copyLink()}>
            {copied ? "Скопировано" : "Скопировать ссылку"}
          </button>
          {me ? (
            <Link className="pk-btn ghost" to="/app">
              К списку
            </Link>
          ) : null}
        </div>
      </div>
      {err ? <p className="err app-note">{err}</p> : null}
      <div className="deck-layout">
        <nav className="deck-thumbs" aria-label="Страницы">
          {slides.map((s) => (
            <button
              key={s.index}
              type="button"
              data-thumb={s.index}
              className={`deck-thumb${s.index === current ? " is-current" : ""}`}
              aria-label={s.heading ? `${s.index}. ${s.heading}` : `Страница ${s.index}`}
              aria-current={s.index === current ? "true" : undefined}
              onClick={() => go(s.index)}
            >
              <span className="deck-thumb-n">{s.index}</span>
              <span className="deck-thumb-frame" aria-hidden>
                {stageReady ? (
                  <iframe
                    title=""
                    tabIndex={-1}
                    src={embedSlideUrl(embedBase, s.index)}
                    loading="lazy"
                  />
                ) : null}
              </span>
            </button>
          ))}
        </nav>
        <div className="deck-stage">
          <div className="deck-stage-frame">
            {id && !err ? (
              <iframe
                ref={stageRef}
                title={meta?.topic ?? "Презентация"}
                src={embedDeckUrl(embedBase)}
                fetchPriority="high"
                onLoad={() => setStageReady(true)}
              />
            ) : null}
            <div className="deck-stage-nav" aria-hidden>
              <button type="button" className="deck-hit left" onClick={() => go(current - 1)} />
              <button type="button" className="deck-hit right" onClick={() => go(current + 1)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
