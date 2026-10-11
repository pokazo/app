import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { api, apiUrl } from "../api";
import { deckStatusLabel, deckViewable, sanitizeDeckTheme, sanitizeSlideCount } from "../decks";
import { ThemePicker } from "../components/ThemePicker";
import { SlideCountPicker } from "../components/SlideCountPicker";

type Me = { id: string; email: string; name: string };

export function AppHome() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [topic, setTopic] = useState(params.get("topic") ?? "");
  const [theme, setTheme] = useState(() => sanitizeDeckTheme(params.get("theme")));
  const [slideCount, setSlideCount] = useState(() => sanitizeSlideCount(params.get("slides")));
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
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
    try {
      let created: { deckId: string };
      if (files.length > 0) {
        const form = new FormData();
        form.set("topic", topic);
        form.set("locale", "ru");
        form.set("slideCount", String(slideCount));
        form.set("audience", "school");
        form.set("theme", theme);
        for (const f of files) form.append("files", f);
        created = await api<{ deckId: string }>("/api/decks", {
          method: "POST",
          body: form,
        });
      } else {
        created = await api<{ deckId: string }>("/api/decks", {
          method: "POST",
          body: JSON.stringify({ topic, locale: "ru", slideCount, audience: "school", theme }),
        });
      }
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const d = await api<{ status: string; viewUrl: string | null; error?: string }>(
          `/api/decks/${created.deckId}`,
        );
        setStatus(d.status);
        if (deckViewable(d.status)) {
          nav(`/view/${created.deckId}`);
          return;
        }
        if (d.status === "failed") {
          setErr(d.error || "Не собралось");
          setStatus("");
          return;
        }
      }
    } catch {
      setErr("Не удалось создать");
      setStatus("");
    }
  }

  if (!me) return null;

  const label = deckStatusLabel(status);

  return (
    <>
      <PkHeader me={me} onOut={onOut} />
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
    </>
  );
}
