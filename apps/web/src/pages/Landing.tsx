import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { PkSlideFrame } from "../components/PkSlideFrame";
import { apiUrl } from "../safe";
import { sanitizeDeckTheme } from "../decks";
import { ThemePicker } from "../components/ThemePicker";

const THUMBS = [
  {
    title: "Фотосинтез",
    body: "Растения превращают свет в энергию.",
    items: ["Свет", "Вода", "Углекислый газ"],
  },
  {
    title: "Как сделать доклад",
    body: "Тема, план, показ по ссылке.",
    items: ["Школа", "8 слайдов", "Онлайн"],
  },
  {
    title: "Питч для работы",
    body: "Одна идея на слайд, без PowerPoint.",
    items: ["Проблема", "Решение", "Следующий шаг"],
  },
  {
    title: "ИИ для презентаций",
    body: "Нейросеть собирает слайды по теме.",
    items: ["Русский", "Без VPN", "Ссылка коллегам"],
  },
  {
    title: "Вуз: курсовая защита",
    body: "Структура выступления на 10 минут.",
    items: ["Цель", "Метод", "Вывод"],
  },
  {
    title: "Урок за вечер",
    body: "Готовый показ, который можно открыть в браузере.",
    items: ["Тема", "Слайды", "Ссылка"],
  },
];

export function Landing() {
  const [topic, setTopic] = useState("");
  const [theme, setTheme] = useState("auto");
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
    const dest = `/app?topic=${encodeURIComponent(text)}&theme=${encodeURIComponent(pick)}`;
    try {
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      if (res.ok) nav(dest);
      else nav(`/login?next=/app&topic=${encodeURIComponent(text)}&theme=${encodeURIComponent(pick)}`);
    } catch {
      nav(`/login?next=/app&topic=${encodeURIComponent(text)}&theme=${encodeURIComponent(pick)}`);
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
              <PkSlideFrame key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <ul>
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </PkSlideFrame>
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
              <p>Нет.</p>
            </details>
            <details>
              <summary>Можно без PowerPoint?</summary>
              <p>Да, показ в браузере.</p>
            </details>
            <details>
              <summary>Когда файл PPTX?</summary>
              <p>Позже, в MVP не обещаем.</p>
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
