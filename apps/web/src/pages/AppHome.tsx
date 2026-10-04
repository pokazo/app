import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { PkInput } from "../components/PkInput";
import { api, apiUrl } from "../api";

type Me = { id: string; email: string; name: string };

export function AppHome() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [topic, setTopic] = useState(params.get("topic") ?? "");
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
    await fetch(apiUrl("/api/auth/sign-out"), { method: "POST", credentials: "include" });
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
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const d = await api<{ status: string; viewUrl: string | null; error?: string }>(
          `/api/decks/${created.deckId}`,
        );
        setStatus(d.status);
        if (d.status === "ready" && d.viewUrl) {
          window.location.href = d.viewUrl;
          return;
        }
        if (d.status === "failed") {
          setErr(d.error || "Не собралось");
          return;
        }
      }
    } catch {
      setErr("Не удалось создать");
      setStatus("");
    }
  }

  if (!me) return null;

  const label =
    status === "queued"
      ? "В очереди"
      : status === "generating"
        ? "Пишем слайды"
        : status === "building"
          ? "Собираем показ"
          : status;

  return (
    <>
      <PkHeader me={me} onOut={onOut} />
      <main className="wrap hero">
        <h1>Новая презентация</h1>
        <form onSubmit={onCreate}>
          <PkInput
            style={{ width: "100%" }}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Тема доклада…"
          />
          <p>
            <PkButton disabled={topic.trim().length < 5 || Boolean(status)} type="submit">
              {status ? "Создаём…" : "Создать"}
            </PkButton>
          </p>
        </form>
        {status ? <p>{label}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </main>
    </>
  );
}
