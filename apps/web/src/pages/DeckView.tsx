import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { apiUrl } from "../api";
import { embedDeckUrl, slidevNavigateMessage } from "../deck-view";
import {
  isDeckId,
  progressiveSlideReveal,
  shouldPollDeckView,
  VIEW_NOT_FOUND_ERR,
  VIEW_WAITING_NOTE,
} from "../deck-view-poll";
import { APP_HISTORY_PATH } from "../decks";
import { thumbReactKey } from "../deck-thumb-preview";
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
  rewritingSlide?: number;
  rewriteError?: string;
};

const WAIT_TIMEOUT_MS = 20 * 60 * 1000;
const POLL_MS = 2000;

export function DeckView() {
  const { id = "" } = useParams();
  const stageRef = useRef<HTMLIFrameElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meta, setMeta] = useState<ViewMeta | null>(null);
  const [err, setErr] = useState("");
  const [waiting, setWaiting] = useState(true);
  const [current, setCurrent] = useState(1);
  const [copied, setCopied] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);
  const [exportErr, setExportErr] = useState("");
  const [speechOpen, setSpeechOpen] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);
  const [building, setBuilding] = useState(false);
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteFiles, setRewriteFiles] = useState<File[]>([]);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [rewriteErr, setRewriteErr] = useState("");
  const [rewritingSlide, setRewritingSlide] = useState<number | null>(null);
  const forcePollRef = useRef(false);
  const stayOnSlideRef = useRef<number | null>(null);
  const rewriteFileRef = useRef<HTMLInputElement>(null);

  const embedBase = apiUrl(`/p/${id}/`);
  const idOk = isDeckId(id);

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

  // Wait for first preview dist, then poll until compose finishes (remount iframe on ready).
  useEffect(() => {
    setMeta(null);
    setErr("");
    setWaiting(true);
    setCurrent(1);
    setStageReady(false);
    setBuilding(false);
    setEmbedKey(0);
    setSpeechOpen(false);
    setRewriteText("");
    setRewriteBusy(false);
    setRewriteErr("");
    setRewritingSlide(null);
    forcePollRef.current = false;
    stayOnSlideRef.current = null;

    if (!idOk) {
      setWaiting(false);
      setErr(VIEW_NOT_FOUND_ERR);
      return;
    }

    let cancelled = false;
    let stopped = false;
    let hasMeta = false;
    let isBuilding = false;
    let slideCount = 0;
    const started = Date.now();

    const stopWithError = (message: string) => {
      stopped = true;
      setWaiting(false);
      setErr(message);
    };

    const tick = async () => {
      if (cancelled || stopped) return;
      if (
        !shouldPollDeckView({
          hasMeta,
          building: isBuilding,
          forcePoll: forcePollRef.current,
        })
      ) {
        return;
      }

      try {
        const data = await loadView();
        if (cancelled || stopped) return;
        const firstMeta = !hasMeta;
        const wasBuilding = hasMeta && isBuilding;
        const nextCount = data.slides.length;
        const reveal = progressiveSlideReveal({
          prevCount: slideCount,
          nextCount,
          building: Boolean(data.building),
        });
        hasMeta = true;
        isBuilding = Boolean(data.building);
        slideCount = nextCount;
        if (isBuilding) forcePollRef.current = true;
        if (!isBuilding) forcePollRef.current = false;
        setMeta(data);
        setWaiting(false);
        setErr("");
        setBuilding(isBuilding);
        setRewritingSlide(
          typeof data.rewritingSlide === "number" ? data.rewritingSlide : null,
        );
        if (data.rewriteError && !isBuilding) {
          setRewriteErr(data.rewriteError);
          setRewriteBusy(false);
        }
        if (firstMeta) {
          setCurrent(data.slides[0]?.index ?? 1);
        } else if (reveal.remount) {
          setStageReady(false);
          setEmbedKey((k) => k + 1);
          if (reveal.focusSlide != null) setCurrent(reveal.focusSlide);
        }
        if (wasBuilding && !isBuilding) {
          setStageReady(false);
          setEmbedKey((k) => k + 1);
          setRewriteBusy(false);
          const stay = stayOnSlideRef.current;
          stayOnSlideRef.current = null;
          const max = data.slides.length || 1;
          if (stay != null) {
            setCurrent(Math.min(max, Math.max(1, stay)));
          } else {
            // Keep the page the user is on after progressive reveal / final remount.
            setCurrent((c) => Math.min(max, Math.max(1, c)));
          }
        }
      } catch {
        if (cancelled || stopped || hasMeta) return;
        try {
          const dr = await fetch(apiUrl(`/api/decks/${id}`), { credentials: "include" });
          if (cancelled || stopped) return;
          if (dr.status === 404) {
            stopWithError(VIEW_NOT_FOUND_ERR);
            return;
          }
          if (dr.ok) {
            const d = (await dr.json()) as { status?: string; error?: string };
            if (d.status === "failed") {
              stopWithError(d.error || "Не собралось");
              return;
            }
          }
        } catch {
          /* public link — keep waiting for /api/view */
        }
        if (Date.now() - started > WAIT_TIMEOUT_MS) {
          stopWithError(VIEW_NOT_FOUND_ERR);
        }
      }
    };

    void tick();
    const t = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [id, idOk, loadView]);

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

  async function submitRewrite() {
    if (!id || !me || building || rewriteBusy) return;
    const instruction = rewriteText.trim();
    if (instruction.length < 2 && rewriteFiles.length === 0) {
      setRewriteErr("Напишите, что переделать, или прикрепите картинку.");
      return;
    }
    setRewriteErr("");
    setRewriteBusy(true);
    stayOnSlideRef.current = current;
    forcePollRef.current = true;
    setBuilding(true);
    setRewritingSlide(current);
    try {
      let res: Response;
      if (rewriteFiles.length > 0) {
        const form = new FormData();
        form.set("instruction", instruction || "Замени картинку на этом слайде на прикреплённое фото.");
        for (const f of rewriteFiles.slice(0, 5)) form.append("files", f);
        res = await fetch(apiUrl(`/api/decks/${id}/slides/${current}/rewrite`), {
          method: "POST",
          credentials: "include",
          body: form,
        });
      } else {
        res = await fetch(apiUrl(`/api/decks/${id}/slides/${current}/rewrite`), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction }),
        });
      }
      if (res.status === 202) {
        setRewriteText("");
        setRewriteFiles([]);
        if (rewriteFileRef.current) rewriteFileRef.current.value = "";
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      forcePollRef.current = false;
      setBuilding(false);
      setRewriteBusy(false);
      setRewritingSlide(null);
      stayOnSlideRef.current = null;
      if (res.status === 401) {
        setRewriteErr("Войдите, чтобы пересобрать слайд.");
        return;
      }
      if (res.status === 409) {
        setRewriteErr("Сейчас идёт сборка — подождите и попробуйте снова.");
        return;
      }
      setRewriteErr(body.error || "Не удалось запустить пересборку.");
    } catch {
      forcePollRef.current = false;
      setBuilding(false);
      setRewriteBusy(false);
      setRewritingSlide(null);
      stayOnSlideRef.current = null;
      setRewriteErr("Не удалось запустить пересборку.");
    }
  }

  const slides = meta?.slides ?? [];
  const rewriteReady = Boolean(me && meta && meta.status === "ready" && !building && !rewriteBusy);

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
      {waiting && !err ? <p className="app-note deck-building">{VIEW_WAITING_NOTE}</p> : null}
      {building && meta ? (
        <p className="app-note deck-building">
          {rewritingSlide != null
            ? `Пересобираем слайд ${rewritingSlide}…`
            : "Собираем остальные слайды…"}
        </p>
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
                key={thumbReactKey(s.index)}
                embedBase={embedBase}
                embedCacheKey={embedKey}
                index={s.index}
                heading={s.heading || `Слайд ${s.index}`}
                imageUrl={s.image ? apiUrl(`/p/${id}${s.image}`) : null}
                enabled={stageReady}
              />
            </button>
          ))}
        </nav>
        <div
          className={`deck-stage${me && meta?.status === "ready" ? " has-rewrite" : ""}`}
        >
          <div className="deck-stage-frame">
            {id && meta && !err ? (
              <iframe
                key={embedKey}
                ref={stageRef}
                title={meta.topic ?? "Презентация"}
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
          {meta && me && meta.status === "ready" ? (
            <form
              className="deck-rewrite"
              onSubmit={(e) => {
                e.preventDefault();
                void submitRewrite();
              }}
            >
              <div className="deck-rewrite-row">
                <input
                  id="deck-rewrite-input"
                  className="deck-rewrite-input"
                  type="text"
                  value={rewriteText}
                  disabled={!rewriteReady}
                  placeholder="Что переделать на этом слайде…"
                  aria-label={`Что переделать на слайде ${current}`}
                  onChange={(e) => setRewriteText(e.target.value)}
                />
                <label className="deck-rewrite-file">
                  <span className="deck-rewrite-file-btn" aria-hidden>
                    {rewriteFiles.length ? `Файл ${rewriteFiles.length}` : "Файл"}
                  </span>
                  <input
                    ref={rewriteFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={!rewriteReady}
                    aria-label="Прикрепить картинку для этого слайда"
                    onChange={(e) =>
                      setRewriteFiles(Array.from(e.target.files ?? []).slice(0, 5))
                    }
                  />
                </label>
                <button type="submit" className="pk ghost" disabled={!rewriteReady}>
                  {rewriteBusy || (building && rewritingSlide != null)
                    ? "Пересобираем…"
                    : "изменить"}
                </button>
              </div>
              {rewriteFiles.length ? (
                <p className="deck-rewrite-hint">
                  Прикреплено: {rewriteFiles.map((f) => f.name).join(", ")}
                </p>
              ) : null}
              {rewriteErr ? <p className="err app-note">{rewriteErr}</p> : null}
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
