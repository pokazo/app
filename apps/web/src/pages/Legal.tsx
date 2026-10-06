import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";

const DOCS: Record<
  string,
  { title: string; description: string; body: string }
> = {
  offer: {
    title: "Публичная оферта — Показо",
    description: "Публичная оферта сервиса Показо для создания презентаций онлайн.",
    body:
      "Текст публичной оферты на оказание услуг сервиса Показо (pokazo.ru) будет опубликован до запуска оплаты. До этого момента сервис предоставляется в тестовом режиме.",
  },
  privacy: {
    title: "Политика персональных данных — Показо",
    description: "Политика обработки персональных данных сервиса Показо.",
    body:
      "Политика обработки персональных данных сервиса Показо (pokazo.ru) будет опубликована до запуска оплаты. Обрабатываем email для входа и служебные данные сессии.",
  },
};

export function Legal() {
  const { doc = "" } = useParams();
  const page = DOCS[doc];

  useEffect(() => {
    if (!page) {
      document.title = "Документ не найден — Показо";
      return;
    }
    document.title = page.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", page.description);
  }, [page]);

  if (!page) {
    return (
      <>
        <PkHeader />
        <main className="wrap" style={{ padding: "48px 20px 80px", textAlign: "center" }}>
          <h1>Документ не найден</h1>
          <p>
            <Link to="/">На главную</Link>
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <PkHeader />
      <main className="wrap" style={{ padding: "48px 20px 80px", textAlign: "center" }}>
        <h1>{page.title.replace(" — Показо", "")}</h1>
        <p>{page.body}</p>
        <p style={{ marginTop: 24 }}>
          <Link to="/">На главную</Link>
          {" · "}
          {doc === "offer" ? (
            <Link to="/legal/privacy">Персональные данные</Link>
          ) : (
            <Link to="/legal/offer">Оферта</Link>
          )}
        </p>
      </main>
    </>
  );
}
