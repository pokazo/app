import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { PkButton } from "../components/PkButton";
import { PkInput } from "../components/PkInput";
import { PkSlideFrame } from "../components/PkSlideFrame";
import { apiUrl } from "../safe";

export function Landing() {
  const [topic, setTopic] = useState("");
  const nav = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const t = topic.trim();
    if (t.length < 5) return;
    const dest = `/app?topic=${encodeURIComponent(t)}`;
    try {
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      if (res.ok) nav(dest);
      else nav(`/login?next=/app&topic=${encodeURIComponent(t)}`);
    } catch {
      nav(`/login?next=/app&topic=${encodeURIComponent(t)}`);
    }
  }

  return (
    <>
      <PkHeader />
      <main>
        <section className="hero wrap">
          <h1>
            Нейросеть для презентаций
            <div className="brand">Показо</div>
          </h1>
          <p className="lead">Тема — слайды в браузере за пару минут. Ссылку можно отправить.</p>
          <form className="row" onSubmit={onSubmit}>
            <PkInput
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: «Фотосинтез, 8 слайдов, 8 класс»"
            />
            <PkButton data-pk="cta-create" disabled={topic.trim().length < 5} type="submit">
              Создать
            </PkButton>
          </form>
          <div style={{ marginTop: 32 }}>
            <PkSlideFrame>
              <strong>Фотосинтез</strong>
              <p>Растения превращают свет в энергию.</p>
              <ul>
                <li>Свет</li>
                <li>Вода</li>
                <li>Углекислый газ</li>
              </ul>
            </PkSlideFrame>
          </div>
        </section>
        <section className="section alt">
          <div className="wrap">
            <h2>Три шага</h2>
            <div className="steps">
              <div>1. Тема</div>
              <div>2. ИИ собирает слайды</div>
              <div>3. Смотрите по ссылке</div>
            </div>
          </div>
        </section>
        <section className="section wrap">
          <h2>Для кого</h2>
          <span className="chip">Школа</span>
          <span className="chip">Вуз</span>
          <span className="chip">Работа</span>
        </section>
        <section className="section wrap">
          <h2>Вопросы</h2>
          <p>Нужен ли VPN? Нет.</p>
          <p>Можно без PowerPoint? Да, показ в браузере.</p>
          <p>Когда файл PPTX? Позже, в MVP не обещаем.</p>
        </section>
      </main>
      <footer className="foot">
        <div className="wrap">
          <a href="/legal/offer">Оферта</a> · <a href="/legal/privacy">Персональные данные</a>
        </div>
      </footer>
    </>
  );
}
