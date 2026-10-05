import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { api, apiUrl } from "../api";
import {
  APP_HISTORY_PATH,
  Deck,
  deckBusy,
  deckStatusLabel,
  formatWhen,
} from "../decks";

type Me = { id: string; email: string; name: string };

export function DeckHistory() {
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
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
      .catch(() => nav(`/login?next=${encodeURIComponent(APP_HISTORY_PATH)}`));
  }, [nav]);

  useEffect(() => {
    if (!me) return;
    void loadDecks();
  }, [me, loadDecks]);

  useEffect(() => {
    if (!decks?.some((d) => deckBusy(d.status))) return;
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

  if (!me) return null;

  return (
    <>
      <PkHeader me={me} onOut={onOut} />
      <main className="app-page">
        <div className="wrap app-form">
          <h1>История презентаций</h1>
          {listErr ? <p className="err app-note">{listErr}</p> : null}
          {decks && decks.length === 0 ? (
            <p className="app-empty">
              Пока пусто.{" "}
              <Link to="/app">Создай презентацию</Link> — она появится здесь.
            </p>
          ) : null}
          {decks && decks.length > 0 ? (
            <ul className="deck-list deck-list-solo">
              {decks.map((d) => (
                <li className="deck-item" key={d.deckId}>
                  <div>
                    <p className="deck-topic">{d.topic}</p>
                    <p className="deck-meta">
                      <span className={`deck-status ${d.status}`}>{deckStatusLabel(d.status)}</span>
                      {" · "}
                      {d.slideCount} слайдов
                      {d.createdAt ? ` · ${formatWhen(d.createdAt)}` : ""}
                    </p>
                    {d.status === "failed" && d.error ? <p className="err deck-error">{d.error}</p> : null}
                  </div>
                  {d.status === "ready" ? (
                    <Link className="pk-btn primary" to={`/view/${d.deckId}`}>
                      Смотреть
                    </Link>
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
