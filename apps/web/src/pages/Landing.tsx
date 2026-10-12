import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { SiteFooter } from "../components/SiteFooter";
import { LandingPromptForm } from "../components/LandingPromptForm";
import { ExampleThumb, type ExampleThumbId } from "../components/ExampleThumb";
import { AUDIENCE_PAGES } from "../audience-pages";
import { apiUrl } from "../safe";

const THUMBS: { id: ExampleThumbId; title: string }[] = [
  { id: "photosynthesis", title: "Фотосинтез" },
  { id: "report", title: "Как сделать доклад" },
  { id: "pitch", title: "Питч для работы" },
  { id: "ai", title: "ИИ для презентаций" },
  { id: "defense", title: "Вуз: курсовая защита" },
  { id: "lesson", title: "Урок за вечер" },
];

const HOME_TITLE = "Нейросеть для презентаций — Показо";
const HOME_DESC =
  "Создайте презентацию по теме онлайн. Русский язык, без VPN. Показ по ссылке в браузере.";

export function Landing() {
  const [me, setMe] = useState<{ name?: string | null; email?: string } | null>(null);

  useEffect(() => {
    document.title = HOME_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", HOME_DESC);
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
            <p className="lead">Тема — слайды в браузере за пару минут. Ссылку можно отправить.</p>
            <LandingPromptForm placeholder="Например: «Фотосинтез, 8 слайдов, 8 класс»" />
          </div>
        </section>
        <section className="section alt">
          <div className="wrap">
            <p className="kicker" style={{ textAlign: "center" }}>Как это работает</p>
            <h2>От идеи к показу за три шага</h2>
            <div className="steps">
              <div>
                <div className="step-n">1</div>
                <strong>Тема</strong>
                <p className="lead" style={{ margin: "8px 0 0" }}>
                  Пишешь, о чём доклад.
                </p>
              </div>
              <div>
                <div className="step-n">2</div>
                <strong>ИИ собирает слайды</strong>
                <p className="lead" style={{ margin: "8px 0 0" }}>
                  Нейросеть для презентаций собирает показ.
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
        <section className="section wrap">
          <p className="kicker" style={{ textAlign: "center" }}>Примеры</p>
          <h2>Что можно создать</h2>
          <div className="thumbs">
            {THUMBS.map((s) => (
              <ExampleThumb key={s.id} id={s.id} title={s.title} />
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
            <details open>
              <summary>Нужен ли VPN?</summary>
              <p>Нет. Показо работает в России на русском языке, без VPN и зарубежных аккаунтов.</p>
            </details>
            <details>
              <summary>Можно без PowerPoint?</summary>
              <p>Да. Презентация открывается в браузере по ссылке — коллегам и ученикам файл не нужен.</p>
            </details>
            <details>
              <summary>Можно скачать PDF или PPTX?</summary>
              <p>
                Да. В готовой презентации есть «Скачать PDF» и «Скачать PPTX». PPTX — слайды как
                картинки (удобно показать в PowerPoint; текст внутри файла не правится).
              </p>
            </details>
            <details>
              <summary>На каком языке слайды?</summary>
              <p>На русском: тема, структура и тексты слайдов под урок, доклад, школу, студентов и бизнес.</p>
            </details>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
