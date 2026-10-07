import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../api";
import { createDebouncedSaver } from "../speech-save";

export type SpeechSlide = {
  index: number;
  heading: string;
  theses: string;
  speech: string;
};

type SpeechDoc = { slides: SpeechSlide[] };
type SpeechGet = SpeechDoc | { status: "missing" };

type Props = {
  deckId: string;
  topic: string;
  onClose: () => void;
};

function isMissing(v: SpeechGet): v is { status: "missing" } {
  return "status" in v && v.status === "missing";
}

export function SpeechModal({ deckId, topic, onClose }: Props) {
  const [doc, setDoc] = useState<SpeechDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saverRef = useRef<ReturnType<typeof createDebouncedSaver<SpeechDoc>> | null>(null);

  useEffect(() => {
    saverRef.current = createDebouncedSaver(async (value) => {
      setSaveState("saving");
      try {
        const res = await fetch(apiUrl(`/api/decks/${deckId}/speech`), {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });
        if (!res.ok) throw new Error("save failed");
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 500);
    return () => {
      void saverRef.current?.flush();
      saverRef.current?.cancel();
    };
  }, [deckId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetch(apiUrl(`/api/decks/${deckId}/speech`), { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json() as Promise<SpeechGet>;
      })
      .then((data) => {
        if (cancelled) return;
        if (isMissing(data)) {
          setMissing(true);
          setDoc(null);
        } else {
          setMissing(false);
          setDoc(data);
        }
      })
      .catch(() => {
        if (!cancelled) setErr("Не удалось загрузить спич.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function updateSlide(index: number, patch: Partial<Pick<SpeechSlide, "theses" | "speech">>) {
    setDoc((prev) => {
      if (!prev) return prev;
      const next: SpeechDoc = {
        slides: prev.slides.map((s) => (s.index === index ? { ...s, ...patch } : s)),
      };
      saverRef.current?.schedule(next);
      setSaveState("idle");
      return next;
    });
  }

  async function regenerate() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(apiUrl(`/api/decks/${deckId}/speech/regenerate`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("regen failed");
      const data = (await res.json()) as SpeechDoc;
      setDoc(data);
      setMissing(false);
    } catch {
      setErr("Не удалось сгенерировать спич. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    setErr("");
    try {
      await saverRef.current?.flush();
      const res = await fetch(apiUrl(`/api/decks/${deckId}/export/speech-pdf`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("pdf failed");
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      const plain = /filename="([^"]+)"/i.exec(cd);
      const name = star
        ? decodeURIComponent(star[1])
        : plain?.[1] || `${topic} — спич.pdf`;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setErr("Не удалось сохранить PDF спича.");
    } finally {
      setPdfBusy(false);
    }
  }

  const slides = doc?.slides.slice().sort((a, b) => a.index - b.index) ?? [];

  return (
    <div
      className="speech-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="speech-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="speech-modal-title"
      >
        <header className="speech-modal-head">
          <h2 id="speech-modal-title" className="speech-modal-title">
            <span className="speech-modal-mic" aria-hidden>
              ◉
            </span>
            Спич выступающего
          </h2>
          <div className="speech-modal-actions">
            {doc ? (
              <button
                type="button"
                className="pk ghost"
                disabled={pdfBusy || loading}
                onClick={() => void downloadPdf()}
              >
                {pdfBusy ? "PDF…" : "PDF"}
              </button>
            ) : null}
            <button type="button" className="pk ghost speech-close" onClick={onClose} aria-label="Закрыть">
              ✕
            </button>
          </div>
        </header>

        <div className="speech-modal-body">
          {loading ? <p className="speech-note">Загружаем…</p> : null}
          {err ? <p className="err speech-note">{err}</p> : null}
          {!loading && missing ? (
            <div className="speech-empty">
              <p>Спич ещё не готов. Можно сгенерировать по слайдам колоды.</p>
              <button type="button" className="pk primary" disabled={busy} onClick={() => void regenerate()}>
                {busy ? "Генерируем…" : "Сгенерировать"}
              </button>
            </div>
          ) : null}
          {!loading && doc
            ? slides.map((s) => (
                <section key={s.index} className="speech-slide">
                  <h3 className="speech-slide-title">
                    Слайд {s.index} {s.heading}
                  </h3>
                  <label className="speech-label">
                    <span className="speech-label-text">
                      Тезисы — шпаргалка ведущего (по строке на тезис)
                    </span>
                    <textarea
                      className="speech-theses"
                      rows={4}
                      value={s.theses}
                      onChange={(e) => updateSlide(s.index, { theses: e.target.value })}
                    />
                  </label>
                  <label className="speech-label">
                    <span className="speech-label-text">Спич — полный устный текст</span>
                    <textarea
                      className="speech-speech"
                      rows={6}
                      value={s.speech}
                      onChange={(e) => updateSlide(s.index, { speech: e.target.value })}
                    />
                  </label>
                </section>
              ))
            : null}
          {doc && saveState === "saving" ? <p className="speech-note">Сохраняем…</p> : null}
          {doc && saveState === "saved" ? <p className="speech-note muted">Сохранено</p> : null}
          {doc && saveState === "error" ? <p className="err speech-note">Не удалось сохранить</p> : null}
        </div>
      </div>
    </div>
  );
}
