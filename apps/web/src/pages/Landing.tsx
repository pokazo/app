import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { SiteFooter } from "../components/SiteFooter";
import { LandingPromptForm } from "../components/LandingPromptForm";
import { ExampleThumb, type ExampleThumbId } from "../components/ExampleThumb";
import { AUDIENCE_PAGES } from "../audience-pages";
import homeCopy from "../home-copy.json";
import { apiUrl } from "../safe";

export function Landing() {
  const [me, setMe] = useState<{ name?: string | null; email?: string } | null>(null);

  useEffect(() => {
    document.title = homeCopy.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", homeCopy.description);
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.email) setMe(data);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <PkHeader me={me} />
      <main>
        <section className="hero">
          <div className="wrap">
            <h1>
              <span className="accent">Нейросеть</span> для презентаций
            </h1>
            {homeCopy.lead.map((line) => (
              <p className="lead" key={line}>
                {line}
              </p>
            ))}
            <LandingPromptForm placeholder={homeCopy.placeholder} />
          </div>
        </section>
        <section className="section alt">
          <div className="wrap">
            <p className="kicker" style={{ textAlign: "center" }}>Как это работает</p>
            <h2>От идеи к показу за три шага</h2>
            <div className="steps">
              {homeCopy.steps.map((step, i) => (
                <div key={step.title}>
                  <div className="step-n">{i + 1}</div>
                  <strong>{step.title}</strong>
                  <p className="lead" style={{ margin: "8px 0 0" }}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="section wrap">
          <p className="kicker" style={{ textAlign: "center" }}>Примеры</p>
          <h2>Что можно создать</h2>
          <div className="thumbs">
            {homeCopy.examples.map((s) => (
              <ExampleThumb key={s.id} id={s.id as ExampleThumbId} title={s.title} />
            ))}
          </div>
        </section>
        <section className="section alt who">
          <div className="wrap">
            <h2>Для кого</h2>
            {AUDIENCE_PAGES.map((p) => (
              <Link key={p.slug} className="chip" to={`/${p.slug}`}>
                {p.chip}
              </Link>
            ))}
          </div>
        </section>
        <section className="section wrap">
          <p className="kicker" style={{ textAlign: "center" }}>FAQ</p>
          <h2>Вопросы</h2>
          <div className="faq">
            {homeCopy.faq.map((item, i) => (
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
