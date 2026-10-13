import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { api, ApiError, apiUrl } from "../api";
import {
  Deck,
  deckBusy,
  deckBusyLabel,
  deckStatusLabel,
  deckViewable,
  formatWhen,
  sanitizeDeckTheme,
  sanitizeSlideCount,
} from "../decks";
import { sanitizeAudience } from "../audience-pages";
import { ThemePicker } from "../components/ThemePicker";
import { SlideCountPicker } from "../components/SlideCountPicker";
import { PaywallModal } from "../components/PaywallModal";
import { BillingMe } from "../billing";

type Me = { id: string; email: string; name: string };

const RESUME_DECK_LIMIT = 3;

/** Survives React Strict Mode remount so landing→/app?topic=… creates once. */
const autoCreateLocks = new Set<string>();

export function AppHome() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [paywall, setPaywall] = useState<BillingMe | null>(null);
  const [resumeDecks, setResumeDecks] = useState<Deck[]>([]);
  const [topic, setTopic] = useState(params.get("topic") ?? "");
  const [theme, setTheme] = useState(() => sanitizeDeckTheme(params.get("theme")));
  const [slideCount, setSlideCount] = useState(() => sanitizeSlideCount(params.get("slides")));
  const [audience] = useState(() => sanitizeAudience(params.get("audience")));
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [activity, setActivity] = useState("");
  const [err, setErr] = useState("");
  const creatingRef = useRef(false);
  const topicRef = useRef(topic);
  const themeRef = useRef(theme);
  const slideCountRef = useRef(slideCount);
  const audienceRef = useRef(audience);
  const filesRef = useRef(files);
  topicRef.current = topic;
  themeRef.current = theme;
  slideCountRef.current = slideCount;
  audienceRef.current = audience;
  filesRef.current = files;

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("no session");
        return r.json();
      })
      .then((data: Me) => setMe(data))
      .catch(() => nav(`/login?next=${encodeURIComponent("/app")}`));
  }, [nav]);

  const loadResumeDecks = useCallback(async () => {
    try {
      const data = await api<{ decks: Deck[] }>("/api/decks");
      setResumeDecks(
        data.decks.filter((d) => deckViewable(d.status)).slice(0, RESUME_DECK_LIMIT),
      );
    } catch {
      setResumeDecks([]);
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    void loadResumeDecks();
  }, [me, loadResumeDecks]);

  useEffect(() => {
    if (!resumeDecks.some((d) => deckBusy(d.status))) return;
    const t = setInterval(() => void loadResumeDecks(), 3000);
    return () => clearInterval(t);
  }, [resumeDecks, loadResumeDecks]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    const paidReturn = params.get("paid") === "1";

    void (async () => {
      let baseline: BillingMe | null = null;
      const attempts = paidReturn ? 8 : 1;
      for (let attempt = 0; attempt < attempts && !cancelled; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        try {
          const current = await api<BillingMe>("/api/billing/me");
          if (cancelled) return;
          setBilling(current);
          if (
            baseline &&
            (current.credits !== baseline.credits ||
              current.plan !== baseline.plan ||
              current.planUntil !== baseline.planUntil)
          ) {
            break;
          }
          baseline ??= current;
        } catch {
          if (!cancelled) setBilling(null);
        }
      }
      if (paidReturn && !cancelled) {
        setParams((current) => {
          const next = new URLSearchParams(current);
          next.delete("paid");
          return next;
        }, { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, params, setParams]);

  async function createDeck() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    const topicNow = topicRef.current.trim();
    const themeNow = themeRef.current;
    const slideCountNow = slideCountRef.current;
    const audienceNow = audienceRef.current;
    const filesNow = filesRef.current;
    setErr("");
    setStatus("queued");
    setActivity("Создаём…");
    try {
      let created: { deckId: string };
      if (filesNow.length > 0) {
        const form = new FormData();
        form.set("topic", topicNow);
        form.set("locale", "ru");
        form.set("slideCount", String(slideCountNow));
        form.set("audience", audienceNow);
        form.set("theme", themeNow);
        for (const f of filesNow) form.append("files", f);
        created = await api<{ deckId: string }>("/api/decks", {
          method: "POST",
          body: form,
        });
      } else {
        created = await api<{ deckId: string }>("/api/decks", {
          method: "POST",
          body: JSON.stringify({
            topic: topicNow,
            locale: "ru",
            slideCount: slideCountNow,
            audience: audienceNow,
            theme: themeNow,
          }),
        });
      }
      for (;;) {
        await new Promise((r) => setTimeout(r, 1000));
        const d = await api<{
          status: string;
          viewUrl: string | null;
          error?: string;
          activity?: string | null;
        }>(`/api/decks/${created.deckId}`);
        setStatus(d.status);
        setActivity(d.activity ?? "");
        if (deckViewable(d.status)) {
          nav(`/view/${created.deckId}`, { state: { awaitingPreview: true } });
          return;
        }
        if (d.status === "failed") {
          setErr(d.error || "Не собралось");
          setStatus("");
          setActivity("");
          creatingRef.current = false;
          return;
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        const body = error.body as { billing?: BillingMe } | null;
        if (body?.billing) {
          setBilling(body.billing);
          setPaywall(body.billing);
          setStatus("");
          setActivity("");
          creatingRef.current = false;
          return;
        }
      }
      setErr("Не удалось создать");
      setStatus("");
      setActivity("");
      creatingRef.current = false;
    }
  }

  // Landing/login send ?topic=… — start generate immediately (no second Create click).
  useEffect(() => {
    if (!me) return;
    const qTopic = (params.get("topic") ?? "").trim();
    if (qTopic.length < 5) return;

    const lock = params.toString();
    if (autoCreateLocks.has(lock)) {
      setParams((current) => {
        if (!current.get("topic")) return current;
        const next = new URLSearchParams(current);
        next.delete("topic");
        return next;
      }, { replace: true });
      return;
    }

    // Defer so React Strict Mode's effect cleanup can cancel the first mount.
    const timer = window.setTimeout(() => {
      if (autoCreateLocks.has(lock) || creatingRef.current) return;
      autoCreateLocks.add(lock);
      setParams((current) => {
        if (!current.get("topic")) return current;
        const next = new URLSearchParams(current);
        next.delete("topic");
        return next;
      }, { replace: true });
      void createDeck();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // Intentionally once when session is ready; topic is stripped when create starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-create from query
  }, [me]);

  async function onOut() {
    await fetch(apiUrl("/api/auth/sign-out"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    nav("/login");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await createDeck();
  }

  if (!me) return null;

  const label = deckBusyLabel(status, activity);

  return (
    <>
      <PkHeader me={me} onOut={onOut} billing={billing} />
      <main className="app-page">
        <div className="wrap app-form">
          <h1>Новая презентация</h1>
          <form className="prompt-card" onSubmit={onCreate}>
            <textarea
              className="pk"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Тема новой презентации…"
            />
            <label className="upload-field">
              <span className="upload-field__label">Картинки (опционально)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={Boolean(status)}
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 20))}
              />
            </label>
            <div className="actions">
              <SlideCountPicker
                value={slideCount}
                onChange={setSlideCount}
                disabled={Boolean(status)}
              />
              <PkButton disabled={topic.trim().length < 5 || Boolean(status)} type="submit">
                {status ? label || "Создаём…" : "Создать"}
              </PkButton>
            </div>
          </form>
          <ThemePicker value={theme} onChange={setTheme} disabled={Boolean(status)} />
          {err ? <p className="err app-note">{err}</p> : null}
          {resumeDecks.length > 0 ? (
            <section className="app-resume" aria-label="Продолжить просмотр">
              <h2 className="app-resume-title">Продолжить</h2>
              <ul className="deck-list deck-list-solo">
                {resumeDecks.map((d) => (
                  <li className="deck-item" key={d.deckId}>
                    <div>
                      <p className="deck-topic">{d.topic}</p>
                      <p className="deck-meta">
                        <span className={`deck-status ${d.status}`}>{deckStatusLabel(d.status)}</span>
                        {" · "}
                        {d.slideCount} слайдов
                        {d.createdAt ? ` · ${formatWhen(d.createdAt)}` : ""}
                      </p>
                    </div>
                    <Link className="pk-btn primary" to={`/view/${d.deckId}`}>
                      {d.status === "preview" ? "Смотреть (сборка…)" : "Смотреть"}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
      {paywall ? <PaywallModal billing={paywall} onClose={() => setPaywall(null)} /> : null}
    </>
  );
}
