import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { PkInput } from "../components/PkInput";
import { SiteFooter } from "../components/SiteFooter";
import { apiUrl } from "../safe";

const TITLE = "Контакты — Показо";
const DESC = "Напишите в Показо: вопрос, ошибка или претензия. Ответим на указанную почту.";

export function Contact() {
  const [me, setMe] = useState<{ name?: string | null; email?: string } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", DESC);
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.email) return;
        setMe(data);
        setEmail((current) => current || data.email);
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!consent) {
      setErr("Нужно согласие на обработку персональных данных.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, consent, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Не получилось отправить.");
        return;
      }
      setSent(true);
    } catch {
      setErr("Не получилось отправить. Проверьте сеть и попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="contact-page">
      <PkHeader me={me} />
      <main>
        <form className="card contact-form" onSubmit={onSubmit}>
          {sent ? (
            <>
              <h1>Сообщение отправлено</h1>
              <p className="contact-lead">Ответим на {email}.</p>
              <p className="contact-back">
                <Link to="/">На главную</Link>
              </p>
            </>
          ) : (
            <>
              <h1>Контакты</h1>
              <p className="contact-lead">Вопрос, ошибка или претензия. Ответим на почту, которую укажете.</p>
              <label className="contact-field">
                <span>Имя</span>
                <PkInput
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Как к вам обращаться"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="contact-field">
                <span>Почта</span>
                <PkInput
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  maxLength={120}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="contact-field">
                <span>Сообщение</span>
                <textarea
                  className="pk"
                  name="message"
                  required
                  minLength={5}
                  maxLength={4000}
                  placeholder="Что случилось или что спросить"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <label className="contact-hp" aria-hidden="true">
                Сайт
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
              <label className="consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                Согласен на <a href="/legal/privacy">обработку персональных данных</a>
              </label>
              <PkButton type="submit" data-pk="contact-submit" style={{ width: "100%" }} disabled={!consent || busy}>
                {busy ? "Отправляем…" : "Отправить"}
              </PkButton>
              {err ? <p className="err">{err}</p> : null}
            </>
          )}
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
