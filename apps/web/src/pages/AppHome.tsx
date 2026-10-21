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
  findPendingBuildDeck,
  formatWhen,
  getInFlightBuild,
  homeStartAction,
  rememberInFlightBuild,
  sanitizeDeckTheme,
  sanitizeSlideCount,
} from "../decks";
import { sanitizeAudience } from "../audience-pages";
import { ThemePicker } from "../components/ThemePicker";
import { SlideCountPicker } from "../components/SlideCountPicker";
import { UploadAttach } from "../components/UploadAttach";
import { PaywallModal } from "../components/PaywallModal";
import { trackPaymentSuccess } from "../payment-metrika";
import { BillingMe } from "../billing";
import { clearPendingUploadFiles, getPendingUploadFiles } from "../pending-uploads";

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
  const [files, setFiles] = useState<File[]>(() => getPendingUploadFiles());
  const [status, setStatus] = useState(() => getInFlightBuild()?.status ?? "");
  const [activity, setActivity] = useState(() => getInFlightBuild()?.activity ?? "");
  const [err, setErr] = useState("");
  const creatingRef = useRef(false);
  const aliveRef = useRef(true);
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
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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
            if (paidReturn) trackPaymentSuccess(baseline, current);
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

  function noteInFlight(deckId: string, nextStatus: string, nextActivity?: string | null) {
    if (nextStatus === "ready" || nextStatus === "failed") {
      rememberInFlightBuild(null);
      return;
    }
    const prev = getInFlightBuild();
    rememberInFlightBuild({
      deckId,
      status: nextStatus,
      activity: nextActivity ?? "",
      startedAt: prev?.deckId === deckId ? prev.startedAt : Date.now(),
    });
  }

  /** Poll one deck until the player can open it (or it fails). Stops if Home unmounts. */
  async function trackDeck(deckId: string, openWhenViewable = true) {
    let failures = 0;
    while (aliveRef.current) {
      await new Promise((r) => setTimeout(r, 1000));
      if (!aliveRef.current) return;
      let d: {
        status: string;
        viewUrl: string | null;
        error?: string;
        activity?: string | null;
      };
      try {
        d = await api(`/api/decks/${deckId}`);
      } catch (error) {
        failures += 1;
        if (failures >= 5) throw error;
        continue;
      }
      failures = 0;
      if (!aliveRef.current) return;
      setStatus(d.status);
      setActivity(d.activity ?? "");
      noteInFlight(deckId, d.status, d.activity);
      if (d.status === "failed") {
        setErr(d.error || "Не собралось");
        setStatus("");
        setActivity("");
        creatingRef.current = false;
        return;
      }
      if (d.status === "ready") {
        creatingRef.current = false;
        if (openWhenViewable) {
          nav(`/view/${deckId}`, { state: { awaitingPreview: true } });
        } else {
          setStatus("");
          setActivity("");
        }
        return;
      }
      if (openWhenViewable && deckViewable(d.status)) {
        nav(`/view/${deckId}`, { state: { awaitingPreview: true } });
        return;
      }
    }
  }

  async function createDeck() {
    if (creatingRef.current) return;
    const inflight = getInFlightBuild();
    if (inflight && inflight.deckId && inflight.deckId !== "pending") return;
    creatingRef.current = true;
    const topicNow = topicRef.current.trim();
    const themeNow = themeRef.current;
    const slideCountNow = slideCountRef.current;
    const audienceNow = audienceRef.current;
    const filesNow = filesRef.current;
    clearPendingUploadFiles();
    setErr("");
    setStatus("queued");
    setActivity("Создаём…");
    noteInFlight("pending", "queued", "Создаём…");
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
      noteInFlight(created.deckId, "queued", "Создаём…");
      await trackDeck(created.deckId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        const body = error.body as { billing?: BillingMe } | null;
        if (body?.billing) {
          setBilling(body.billing);
          setPaywall(body.billing);
          setStatus("");
          setActivity("");
          creatingRef.current = false;
          rememberInFlightBuild(null);
          return;
        }
      }
      setErr("Не удалось создать");
      setStatus("");
      setActivity("");
      creatingRef.current = false;
      rememberInFlightBuild(null);
    }
  }

  function stripTopicParam() {
    setParams((current) => {
      if (!current.get("topic")) return current;
      const next = new URLSearchParams(current);
      next.delete("topic");
      return next;
    }, { replace: true });
  }

  // Resume an in-flight build after history/back; otherwise auto-create from ?topic=.
  useEffect(() => {
    if (!me) return;
    let cancelled = false;

    void (async () => {
      const qTopic = (params.get("topic") ?? "").trim();
      let pending: Deck | null = null;
      let listOk = false;
      try {
        const data = await api<{ decks: Deck[] }>("/api/decks");
        pending = findPendingBuildDeck(data.decks);
        listOk = true;
      } catch {
        pending = null;
      }
      if (cancelled) return;

      const inflight = getInFlightBuild();
      if (listOk && !pending && inflight?.deckId !== "pending") {
        rememberInFlightBuild(null);
      } else if (!pending && inflight && inflight.deckId && inflight.deckId !== "pending") {
        pending = {
          deckId: inflight.deckId,
          topic: "",
          status: inflight.status,
          error: null,
          slideCount: 0,
          createdAt: new Date(inflight.startedAt).toISOString(),
          viewUrl: null,
        };
      }

      const action = homeStartAction({
        pending,
        topicFromUrl: qTopic,
        alreadyCreating: creatingRef.current,
      });

      if (action === "resume" && pending) {
        if (creatingRef.current) {
          stripTopicParam();
          return;
        }
        creatingRef.current = true;
        setErr("");
        setStatus(pending.status);
        setActivity(inflight?.deckId === pending.deckId ? inflight.activity ?? "" : "");
        stripTopicParam();
        try {
          await trackDeck(pending.deckId, false);
        } catch {
          if (!aliveRef.current) return;
          setErr("Не удалось получить статус сборки");
          setStatus("");
          setActivity("");
          creatingRef.current = false;
          rememberInFlightBuild(null);
        }
        return;
      }

      if (action !== "auto-create") return;

      const lock = params.toString();
      if (autoCreateLocks.has(lock)) {
        stripTopicParam();
        return;
      }
      autoCreateLocks.add(lock);
      stripTopicParam();
      void createDeck();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when session is ready
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
            <div className="actions">
              <div className="prompt-card-actions-left">
                <UploadAttach
                  files={files}
                  onChange={setFiles}
                  disabled={Boolean(status)}
                />
                <SlideCountPicker
                  value={slideCount}
                  onChange={setSlideCount}
                  disabled={Boolean(status)}
                />
              </div>
              <PkButton disabled={topic.trim().length < 5 || Boolean(status)} type="submit">
                {status ? label || "Создаём…" : "Создать"}
              </PkButton>
            </div>
            {files.length ? (
              <p className="upload-attach-hint">
                Прикреплено: {files.map((f) => f.name).join(", ")}
              </p>
            ) : null}
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
