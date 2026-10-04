import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { api, apiUrl } from "../api";

type Me = { id: string; email: string; name: string };

type Deck = {
  deckId: string;
  topic: string;
  status: string;
  error: string | null;
  slideCount: number;
  createdAt: string;
  viewUrl: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  queued: "В очереди",
  generating: "Пишем слайды",
  building: "Собираем показ",
  ready: "Готово",
  failed: "Не собралось",
};

function busy(status: string) {
  return status === "queued" || status === "generating" || status === "building";
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppHome() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [topic, setTopic] = useState(params.get("topic") ?? "");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [listErr, setListErr] = useState("");

  const loadDecks = useCallback(async () => {
    try {
      const data = await api<{ decks: Deck[] }>("/api/decks");
      setDecks(data.decks);
      setListErr("");
    } catch {
      setListErr("Не загрузили список");
    }
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

  useEffect(() => {
    if (!me) return;
    void loadDecks();
  }, [me, loadDecks]);

  useEffect(() => {
    if (!decks?.some((d) => busy(d.status))) return;
    const t = setInterval(() => void loadDecks(), 3000);
    return () => clearInterval(t);
  }, [decks, loadDecks]);

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
      const created = await api<{ deckId: string }>("/api/decks", {
        method: "POST",
        body: JSON.stringify({ topic, locale: "ru", slideCount: 8, audience: "school" }),
      });
      void loadDecks();
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const d = await api<{ status: string; viewUrl: string | null; error?: string }>(
          `/api/decks/${created.deckId}`,
        );
        setStatus(d.status);
        void loadDecks();
        if (d.status === "ready" && d.viewUrl) {
          window.location.href = d.viewUrl;
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

  const label = STATUS_LABEL[status] ?? status;

  return (
    <>
      <PkHeader me={me} onOut={onOut} />
      <main className="app-page">
        <div className="wrap app-form">
          <h1>Мои презентации</h1>
          <form className="prompt-card" onSubmit={onCreate}>
            <textarea
              className="pk"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Тема новой презентации…"
            />
            <div className="actions">
              <PkButton disabled={topic.trim().length < 5 || Boolean(status)} type="submit">
                {status ? "Создаём…" : "Создать"}
              </PkButton>
            </div>
          </form>
          {status ? <p className="app-note">{label}</p> : null}
          {err ? <p className="err app-note">{err}</p> : null}

          {listErr ? <p className="err app-note">{listErr}</p> : null}
          {decks && decks.length === 0 ? (
            <p className="app-empty">Пока пусто. Напиши тему сверху — появится в списке.</p>
          ) : null}
          {decks && decks.length > 0 ? (
            <ul className="deck-list">
              {decks.map((d) => (
                <li className="deck-item" key={d.deckId}>
                  <div>
                    <p className="deck-topic">{d.topic}</p>
                    <p className="deck-meta">
                      <span className={`deck-status ${d.status}`}>{STATUS_LABEL[d.status] ?? d.status}</span>
                      {" · "}
                      {d.slideCount} слайдов
                      {d.createdAt ? ` · ${formatWhen(d.createdAt)}` : ""}
                    </p>
                    {d.status === "failed" && d.error ? <p className="err deck-error">{d.error}</p> : null}
                  </div>
                  {d.status === "ready" && d.viewUrl ? (
                    <a className="pk-btn primary" href={d.viewUrl}>
                      Смотреть
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>
    </>
  );
}
