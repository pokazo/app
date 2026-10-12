import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { apiUrl } from "../safe";
import { sanitizeDeckTheme, SLIDE_COUNT_DEFAULT } from "../decks";
import { ThemePicker } from "../components/ThemePicker";
import { SlideCountPicker } from "../components/SlideCountPicker";
import { ExampleThumb, type ExampleThumbId } from "../components/ExampleThumb";

const THUMBS: { id: ExampleThumbId; title: string }[] = [
  { id: "photosynthesis", title: "Фотосинтез" },
  { id: "report", title: "Как сделать доклад" },
  { id: "pitch", title: "Питч для работы" },
  { id: "ai", title: "ИИ для презентаций" },
  { id: "defense", title: "Вуз: курсовая защита" },
  { id: "lesson", title: "Урок за вечер" },
];

export function Landing() {
  const [topic, setTopic] = useState("");
  const [theme, setTheme] = useState("auto");
  const [slideCount, setSlideCount] = useState(SLIDE_COUNT_DEFAULT);
  const [me, setMe] = useState<{ name?: string | null; email?: string } | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.email) setMe(data);
      })
      .catch(() => {});
  }, []);

  async function goCreate(t: string) {
    const text = t.trim();
    if (text.length < 5) return;
    const pick = sanitizeDeckTheme(theme);
    const q = `topic=${encodeURIComponent(text)}&theme=${encodeURIComponent(pick)}&slides=${slideCount}`;
    const dest = `/app?${q}`;
    try {
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      if (res.ok) nav(dest);
      else nav(`/login?next=/app&${q}`);
    } catch {
      nav(`/login?next=/app&${q}`);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await goCreate(topic);
  }

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
            <form className="prompt-card" onSubmit={onSubmit}>
              <textarea
                className="pk"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Например: «Фотосинтез, 8 слайдов, 8 класс»"
              />
              <div className="actions">
                <SlideCountPicker value={slideCount} onChange={setSlideCount} />
                <PkButton data-pk="cta-create" disabled={topic.trim().length < 5} type="submit">
                  Создать
                </PkButton>
              </div>
            </form>
            <ThemePicker value={theme} onChange={setTheme} />
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
            <span className="chip">Школа</span>
            <span className="chip">Вуз</span>
            <span className="chip">Работа</span>
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
              <p>На русском: тема, структура и тексты слайдов под российскую школу, вуз и работу.</p>
            </details>
          </div>
        </section>
        <div className="cta-band">
          <h2>Создать презентацию</h2>
          <p>ИИ онлайн, на русском. Тема — и слайды.</p>
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
