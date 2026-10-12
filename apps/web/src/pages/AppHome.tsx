import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { api, ApiError, apiUrl } from "../api";
import { deckBusyLabel, deckViewable, sanitizeDeckTheme, sanitizeSlideCount } from "../decks";
import { sanitizeAudience } from "../audience-pages";
import { ThemePicker } from "../components/ThemePicker";
import { SlideCountPicker } from "../components/SlideCountPicker";
import { PaywallModal } from "../components/PaywallModal";
import { BillingMe } from "../billing";

type Me = { id: string; email: string; name: string };

export function AppHome() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [paywall, setPaywall] = useState<BillingMe | null>(null);
  const [topic, setTopic] = useState(params.get("topic") ?? "");
  const [theme, setTheme] = useState(() => sanitizeDeckTheme(params.get("theme")));
  const [slideCount, setSlideCount] = useState(() => sanitizeSlideCount(params.get("slides")));
  const [audience] = useState(() => sanitizeAudience(params.get("audience")));
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [activity, setActivity] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("no session");
        return r.json();
      })
      .then((data: Me) => setMe(data))
      .catch(() => nav(`/login?next=${encodeURIComponent("/app")}`));
  }, [nav]);

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
    setErr("");
    setStatus("queued");
    setActivity("");
    try {
      let created: { deckId: string };
      if (files.length > 0) {
        const form = new FormData();
        form.set("topic", topic);
        form.set("locale", "ru");
        form.set("slideCount", String(slideCount));
        form.set("audience", audience);
        form.set("theme", theme);
        for (const f of files) form.append("files", f);
        created = await api<{ deckId: string }>("/api/decks", {
          method: "POST",
          body: form,
        });
      } else {
        created = await api<{ deckId: string }>("/api/decks", {
          method: "POST",
          body: JSON.stringify({ topic, locale: "ru", slideCount, audience, theme }),
        });
      }
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const d = await api<{
          status: string;
          viewUrl: string | null;
          error?: string;
          activity?: string | null;
        }>(`/api/decks/${created.deckId}`);
        setStatus(d.status);
        setActivity(d.activity ?? "");
        if (deckViewable(d.status)) {
          nav(`/view/${created.deckId}`);
          return;
        }
        if (d.status === "failed") {
          setErr(d.error || "Не собралось");
          setStatus("");
          setActivity("");
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
          return;
        }
      }
      setErr("Не удалось создать");
      setStatus("");
      setActivity("");
    }
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
                {status ? "Создаём…" : "Создать"}
              </PkButton>
            </div>
          </form>
          <ThemePicker value={theme} onChange={setTheme} disabled={Boolean(status)} />
          {status ? <p className="app-note">{label}</p> : null}
          {err ? <p className="err app-note">{err}</p> : null}
        </div>
      </main>
      {paywall ? <PaywallModal billing={paywall} onClose={() => setPaywall(null)} /> : null}
    </>
  );
}
