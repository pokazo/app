import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { SiteFooter } from "../components/SiteFooter";
import { LandingPromptForm } from "../components/LandingPromptForm";
import { HeroWash } from "../components/HeroWash";
import { ExampleThumb } from "../components/ExampleThumb";
import { AUDIENCE_PAGES, audienceBySlug, type AudienceSlug } from "../audience-pages";
import homeCopy from "../home-copy.json";
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
        <section className="hero hero-wash">
          <HeroWash />
          <div className="wrap">
            <h1>{page.h1}</h1>
            <p className="lead">{page.lead}</p>
            <LandingPromptForm placeholder={page.placeholder} audience={page.slug} />
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
                  {homeCopy.shareStep}
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="section wrap">
          <h2>{page.outlineTitle}</h2>
          <p className="lead">{page.scenario}</p>
          <div className="thumbs">
            {page.examples.map((ex) => (
              <ExampleThumb key={ex.id} id={ex.id} title={ex.title} />
            ))}
          </div>
          <ol>
            {page.outline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p>{homeCopy.offerNote}</p>
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
      </main>
      <SiteFooter />
    </>
  );
}
