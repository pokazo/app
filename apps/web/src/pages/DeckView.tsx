import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { apiUrl } from "../api";
import { embedDeckUrl, slidevNavigateMessage } from "../deck-view";
import { APP_HISTORY_PATH } from "../decks";
import { DeckThumbPreview } from "./DeckThumbPreview";
import { SpeechModal } from "./SpeechModal";

type Me = { id: string; email: string; name: string };
type Slide = { index: number; heading: string; image?: string | null };
type ViewMeta = {
  topic: string;
  slides: Slide[];
  embedBase: string;
  status?: string;
  building?: boolean;
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
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);
  const [exportErr, setExportErr] = useState("");
  const [speechOpen, setSpeechOpen] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);
  const [building, setBuilding] = useState(false);

  const embedBase = apiUrl(`/p/${id}/`);

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (data?.email) setMe(data);
      })
      .catch(() => {});
  }, []);

  const loadView = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/view/${id}`), { credentials: "include" });
    if (!r.ok) throw new Error("not ready");
    return r.json() as Promise<ViewMeta>;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    setErr("");
    setCurrent(1);
    setStageReady(false);
    setBuilding(false);
    setEmbedKey(0);

    loadView()
      .then((data) => {
        if (cancelled) return;
        setMeta(data);
        setBuilding(Boolean(data.building));
        setCurrent(data.slides[0]?.index ?? 1);
      })
      .catch(() => {
        if (!cancelled) setErr("Презентация ещё не готова или ссылка неверная.");
      });

    return () => {
      cancelled = true;
    };
  }, [id, loadView]);

  // While preview/building: poll until ready, then refresh meta + remount iframe (full rebuild).
  useEffect(() => {
    if (!id || !building) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await loadView();
        if (cancelled) return;
        setMeta(data);
        setBuilding(Boolean(data.building));
        if (!data.building) {
          setStageReady(false);
          setEmbedKey((k) => k + 1);
          setCurrent(data.slides[0]?.index ?? 1);
        }
      } catch {
        /* keep polling */
      }
    };
    const t = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [id, building, loadView]);

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

  async function downloadExport(format: "pdf" | "pptx") {
    if (!id || exporting || building) return;
    setExporting(format);
    setExportErr("");
    try {
      const res = await fetch(apiUrl(`/api/decks/${id}/export/${format}`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      const plain = /filename="([^"]+)"/i.exec(cd);
      const name = star
        ? decodeURIComponent(star[1])
        : plain?.[1] || `${meta?.topic || "presentation"}.${format}`;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setExportErr("Не удалось сохранить файл. Попробуйте ещё раз.");
    } finally {
      setExporting(null);
    }
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
          {meta ? (
            <>
              <button
                type="button"
                className="pk ghost"
                disabled={building}
                title={building ? "Дождитесь окончания сборки" : undefined}
                onClick={() => setSpeechOpen(true)}
              >
                Спич
              </button>
              <button
                type="button"
                className="pk ghost"
                disabled={!!exporting || building}
                onClick={() => void downloadExport("pdf")}
              >
                {exporting === "pdf" ? "Сохраняем PDF…" : "Скачать PDF"}
              </button>
              <button
                type="button"
                className="pk ghost"
                disabled={!!exporting || building}
                onClick={() => void downloadExport("pptx")}
              >
                {exporting === "pptx" ? "Сохраняем PPTX…" : "Скачать PPTX"}
              </button>
            </>
          ) : null}
          {me ? (
            <Link className="pk-btn ghost" to={APP_HISTORY_PATH}>
              К списку
            </Link>
          ) : null}
        </div>
      </div>
      {err ? <p className="err app-note">{err}</p> : null}
      {exportErr ? <p className="err app-note">{exportErr}</p> : null}
      {building && meta ? (
        <p className="app-note deck-building">Собираем остальные слайды… первый уже можно смотреть.</p>
      ) : null}
      {speechOpen && id && !building ? (
        <SpeechModal
          deckId={id}
          topic={meta?.topic ?? "Презентация"}
          onClose={() => setSpeechOpen(false)}
        />
      ) : null}
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
              <DeckThumbPreview
                embedBase={embedBase}
                index={s.index}
                heading={s.heading || `Слайд ${s.index}`}
                imageUrl={s.image ? apiUrl(`/p/${id}${s.image}`) : null}
                enabled={stageReady}
              />
            </button>
          ))}
        </nav>
        <div className="deck-stage">
          <div className="deck-stage-frame">
            {id && !err ? (
              <iframe
                key={embedKey}
                ref={stageRef}
                title={meta?.topic ?? "Презентация"}
                src={`${embedDeckUrl(embedBase)}${embedKey ? `&_r=${embedKey}` : ""}`}
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
