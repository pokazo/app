import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkAuthCard } from "../components/PkAuthCard";
import { PkButton } from "../components/PkButton";
import { PkInput } from "../components/PkInput";
import { apiUrl, isSafePath } from "../safe";

export function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = useMemo(() => {
    const base = isSafePath(params.get("next"));
    const topic = params.get("topic") ?? "";
    const topicStash = params.get("topicStash") ?? "";
    const theme = params.get("theme") ?? "";
    const slides = params.get("slides") ?? "";
    const audience = params.get("audience") ?? "";
    let dest = base;
    if (topic) {
      const join = dest.includes("?") ? "&" : "?";
      dest = `${dest}${join}topic=${encodeURIComponent(topic)}`;
    } else if (topicStash === "1") {
      const join = dest.includes("?") ? "&" : "?";
      dest = `${dest}${join}topicStash=1`;
    }
    if (theme) {
      const join = dest.includes("?") ? "&" : "?";
      dest = `${dest}${join}theme=${encodeURIComponent(theme)}`;
    }
    if (slides) {
      const join = dest.includes("?") ? "&" : "?";
      dest = `${dest}${join}slides=${encodeURIComponent(slides)}`;
    }
    if (audience) {
      const join = dest.includes("?") ? "&" : "?";
      dest = `${dest}${join}audience=${encodeURIComponent(audience)}`;
    }
    return dest;
  }, [params]);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
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

  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!consent) {
      setErr("Нужно согласие на обработку персональных данных.");
      return;
    }
    const res = await fetch(apiUrl("/api/auth/email-otp/send-verification-otp"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, type: "sign-in" }),
    });
    if (!res.ok) {
      setErr("Не отправили письмо. Попробуй ещё раз.");
      return;
    }
    setStep("code");
    setMsg("Код отправили на почту. Скопируй его из письма.");
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch(apiUrl("/api/auth/sign-in/email-otp"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: otp.replace(/\s/g, "") }),
    });
    if (!res.ok) {
      setErr("Неверный или просроченный код.");
      return;
    }
    nav(next.startsWith("/") ? next : "/app");
  }

  return (
    <>
      <PkHeader />
      <PkAuthCard title="Вход">
        <PkButton type="button" variant="yandex" data-pk="auth-yandex" onClick={onYandex} disabled={!consent}>
          Войти через Яндекс
        </PkButton>
        <div className="or">или</div>
        {step === "email" ? (
          <form onSubmit={onSendCode}>
            <PkInput
              type="email"
              required
              placeholder="Почта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", marginBottom: 12 }}
            />
            <label>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Согласен на{" "}
              <a href="/legal/privacy">обработку персональных данных</a>
            </label>
            <PkButton type="submit" data-pk="auth-otp-send" style={{ width: "100%" }} disabled={!consent}>
              Прислать код
            </PkButton>
          </form>
        ) : (
          <form onSubmit={onVerify}>
            <p style={{ margin: "0 0 12px", color: "var(--pk-ink-muted)", fontSize: 14 }}>
              Код для {email}
            </p>
            <PkInput
              className="pk otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              required
              placeholder="Код из письма"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{ width: "100%", marginBottom: 12 }}
            />
            <PkButton type="submit" data-pk="auth-otp-verify" style={{ width: "100%" }}>
              Войти
            </PkButton>
            <button type="button" className="pk ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setStep("email")}>
              Другая почта
            </button>
          </form>
        )}
        {msg ? <p>{msg}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </PkAuthCard>
    </>
  );
}
