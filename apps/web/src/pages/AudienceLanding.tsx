import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { LandingPromptForm } from "../components/LandingPromptForm";
import { AUDIENCE_PAGES, audienceBySlug, type AudienceSlug } from "../audience-pages";
import { apiUrl } from "../safe";

export function AudienceLanding(props: { slug: AudienceSlug }) {
  const page = audienceBySlug(props.slug);
  const [me, setMe] = useState<{ name?: string | null; email?: string } | null>(null);

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.email) setMe(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!page) {
      document.title = "Страница не найдена — Показо";
      return;
    }
    document.title = page.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", page.description);
  }, [page]);

  if (!page) {
    return (
      <>
        <PkHeader me={me} />
        <main className="wrap" style={{ padding: "48px 20px 80px", textAlign: "center" }}>
          <h1>Страница не найдена</h1>
          <p>
            <Link to="/">На главную</Link>
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <PkHeader me={me} />
      <main>
        <section className="hero">
          <div className="wrap">
            <h1>{page.h1}</h1>
            <p className="lead">{page.lead}</p>
            <LandingPromptForm placeholder={page.placeholder} />
          </div>
        </section>
        <section className="section alt">
          <div className="wrap">
            <p className="kicker" style={{ textAlign: "center" }}>Как это работает</p>
            <h2>От темы к показу</h2>
            <div className="steps">
              <div>
                <div className="step-n">1</div>
                <strong>Тема</strong>
                <p className="lead" style={{ margin: "8px 0 0" }}>
                  {page.stepsNote}
                </p>
              </div>
              <div>
                <div className="step-n">2</div>
                <strong>ИИ собирает слайды</strong>
                <p className="lead" style={{ margin: "8px 0 0" }}>
                  Нейросеть собирает показ под задачу.
                </p>
              </div>
              <div>
                <div className="step-n">3</div>
                <strong>Смотрите по ссылке</strong>
                <p className="lead" style={{ margin: "8px 0 0" }}>
                  Онлайн, без VPN и без файла.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="section alt who">
          <div className="wrap">
            <h2>Ещё аудитории</h2>
            {AUDIENCE_PAGES.map((p) =>
              p.slug === page.slug ? (
                <span key={p.slug} className="chip is-current">
                  {p.chip}
                </span>
              ) : (
                <Link key={p.slug} className="chip" to={`/${p.slug}`}>
                  {p.chip}
                </Link>
              ),
            )}
            <p style={{ marginTop: 16 }}>
              <Link to="/">Нейросеть для презентаций</Link>
            </p>
          </div>
        </section>
        <section className="section wrap">
          <p className="kicker" style={{ textAlign: "center" }}>FAQ</p>
          <h2>Вопросы</h2>
          <div className="faq">
            {page.faq.map((item, i) => (
              <details key={item.q} open={i === 0}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        <div className="cta-band">
          <h2>Создать презентацию</h2>
          <p>{page.ctaLead}</p>
          <Link className="pk-btn" data-pk="cta-create" to="/login?next=/app">
            Создать
          </Link>
        </div>
      </main>
      <footer className="foot">
        <div className="wrap">
          <a href="/legal/offer">Оферта</a> · <a href="/legal/privacy">Персональные данные</a>
        </div>
      </footer>
    </>
  );
}
