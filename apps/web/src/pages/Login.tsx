import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkAuthCard } from "../components/PkAuthCard";
import { PkButton } from "../components/PkButton";
import { PkInput } from "../components/PkInput";
import { apiUrl, isSafePath } from "../safe";

export function Login() {
  const [params] = useSearchParams();
  const next = useMemo(() => {
    const base = isSafePath(params.get("next"));
    const topic = params.get("topic") ?? "";
    if (!topic) return base;
    const join = base.includes("?") ? "&" : "?";
    return `${base}${join}topic=${encodeURIComponent(topic)}`;
  }, [params]);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onYandex() {
    setErr("");
    if (!consent) {
      setErr("Нужно согласие на обработку персональных данных.");
      return;
    }
    const callbackURL = `${window.location.origin}${next}`;
    const res = await fetch(apiUrl("/api/auth/sign-in/social"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "yandex", callbackURL }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    if (data.url) window.location.href = data.url;
    else setErr("Яндекс ID сейчас недоступен.");
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!consent) {
      setErr("Нужно согласие на обработку персональных данных.");
      return;
    }
    const res = await fetch(apiUrl("/api/auth/sign-in/magic-link"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        callbackURL: `${window.location.origin}${next.startsWith("/") ? next : "/app"}`,
      }),
    });
    if (!res.ok) {
      setErr("Не отправили письмо. Попробуй ещё раз.");
      return;
    }
    setMsg("Письмо со ссылкой отправлено. Проверь почту.");
  }

  return (
    <>
      <PkHeader />
      <PkAuthCard title="Вход">
        <PkButton type="button" variant="yandex" data-pk="auth-yandex" onClick={onYandex} disabled={!consent}>
          Войти через Яндекс
        </PkButton>
        <div className="or">или</div>
        <form onSubmit={onEmail}>
          <PkInput
            type="email"
            required
            placeholder="Почта"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", marginBottom: 12 }}
          />
          <label style={{ display: "flex", gap: 8, fontSize: 14, marginBottom: 12 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            Согласен на{" "}
            <a href="/legal/privacy">обработку персональных данных</a>
          </label>
          <PkButton type="submit" style={{ width: "100%" }} disabled={!consent}>
            Прислать ссылку
          </PkButton>
        </form>
        {msg ? <p>{msg}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </PkAuthCard>
    </>
  );
}
