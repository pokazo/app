import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { SiteFooter } from "../components/SiteFooter";
import { BillingCatalog, DEFAULT_BILLING_CATALOG } from "../billing";
import { reachPkGoal } from "../metrika";
import { apiUrl } from "../safe";

const TITLE = "Тарифы и цены — Показо";
const DESC =
  "Сколько стоит нейросеть для презентаций Показо: одна колода бесплатно, разовая генерация и безлимит на месяц. Оплата картой в России.";

function appCta(me: { email?: string } | null): string {
  return me?.email ? "/app" : "/login?next=/app";
}

export function Pricing(props: { catalog?: BillingCatalog }) {
  const [params] = useSearchParams();
  const [me, setMe] = useState<{ name?: string | null; email?: string } | null>(null);
  const [catalog, setCatalog] = useState<BillingCatalog>(props.catalog ?? DEFAULT_BILLING_CATALOG);

  useEffect(() => {
    document.title = TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", DESC);
    reachPkGoal("pricing-view");
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.email) setMe(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (props.catalog) return;
    fetch(apiUrl("/api/billing/catalog"))
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BillingCatalog | null) => {
        if (data?.prices) setCatalog(data);
      })
      .catch(() => {});
  }, [props.catalog]);

  const { creditRub, monthRub } = catalog.prices;
  const startHref = appCta(me);
  const paidNote = catalog.paymentsEnabled
    ? null
    : "Оплата подключается — цены уже актуальные, списание начнётся после включения.";

  return (
    <>
      <PkHeader me={me} />
      <main>
        <section className="hero pricing-hero">
          <div className="wrap">
            <h1>Тарифы</h1>
            <p className="lead" style={{ maxWidth: 560, margin: "0 auto" }}>
              Одна презентация бесплатно. Дальше — разово или безлимит на месяц. Цены в рублях, оплата
              картой через Точку.
            </p>
            {params.get("reason") === "export" ? (
              <p className="pricing-note">
                PDF и PPTX скачиваются на платном тарифе: разовая колода или безлимит.
              </p>
            ) : null}
          </div>
        </section>
        <section className="section">
          <div className="wrap">
            {paidNote ? <p className="pricing-note">{paidNote}</p> : null}
            <div className="pricing-grid">
              <article className="pricing-card">
                <p className="pricing-kicker">Старт</p>
                <h2 className="pricing-name">Бесплатно</h2>
                <p className="pricing-blurb">Попробовать сервис без карты</p>
                <p className="pricing-price">
                  0 <span className="pricing-currency">₽</span>
                </p>
                <Link className="pk ghost pricing-cta" to={startHref} data-pk="cta-pricing-free">
                  {me ? "Создать" : "Начать бесплатно"}
                </Link>
                <ul className="pricing-features">
                  <li>1 готовая презентация на аккаунт</li>
                  <li>Показ по ссылке в браузере</li>
                  <li>Правки слайдов</li>
                </ul>
              </article>

              <article className="pricing-card">
                <p className="pricing-kicker">Разово</p>
                <h2 className="pricing-name">Ещё одна</h2>
                <p className="pricing-blurb">Когда нужна единичная колода</p>
                <p className="pricing-price">
                  {creditRub} <span className="pricing-currency">₽</span>
                </p>
                <p className="pricing-period">за одну генерацию</p>
                <Link className="pk ghost pricing-cta" to={startHref} data-pk="cta-pricing-credit">
                  {me ? "В приложение" : "Войти и создать"}
                </Link>
                <ul className="pricing-features">
                  <li>+1 новая презентация после бесплатной</li>
                  <li>Скачивание PDF и PPTX этой колоды</li>
                  <li>Оплата в момент создания</li>
                  <li>Готовые колоды остаются в истории</li>
                </ul>
              </article>

              <article className="pricing-card pricing-card-featured">
                <p className="pricing-badge">Выгоднее часто</p>
                <h2 className="pricing-name">Безлимит</h2>
                <p className="pricing-blurb">Много докладов и уроков подряд</p>
                <p className="pricing-price">
                  {monthRub} <span className="pricing-currency">₽</span>
                </p>
                <p className="pricing-period">30 календарных дней</p>
                <Link className="pk pricing-cta" to={startHref} data-pk="cta-pricing-month">
                  {me ? "Создавать без лимита" : "Подключить после входа"}
                </Link>
                <ul className="pricing-features">
                  <li>Неограниченные генерации в рамках лимитов сервиса</li>
                  <li>Правка слайдов и скачивание PDF и PPTX</li>
                  <li>Оформление в приложении при создании колоды</li>
                </ul>
              </article>
            </div>
            <p className="pricing-legal">
              Подробные условия — в{" "}
              <Link to="/legal/offer">публичной оферте</Link>. Сумма на кнопке оплаты совпадает с
              тарифом в интерфейсе.
            </p>
          </div>
        </section>
        <section className="section alt">
          <div className="wrap">
            <p className="kicker" style={{ textAlign: "center" }}>
              FAQ
            </p>
            <h2>Оплата и лимиты</h2>
            <div className="faq">
              <details open>
                <summary>Что считается одной генерацией?</summary>
                <p>
                  Новая колода по теме. Правка слайда кредит не тратит. PDF и PPTX бесплатной колоды
                  скачиваются после оплаты тарифа.
                </p>
              </details>
              <details>
                <summary>Когда списывается оплата?</summary>
                <p>
                  Разовый тариф и месяц выбираете в окне, когда бесплатная презентация уже использована.
                  Переход на оплату — на защищённую страницу банка.
                </p>
              </details>
              <details>
                <summary>Нужен ли VPN или зарубежная карта?</summary>
                <p>Нет. Сервис и оплата рассчитаны на пользователей в России.</p>
              </details>
              <details>
                <summary>Можно ли вернуть деньги?</summary>
                <p>
                  Если колода не была доведена до статуса «готова», напишите в поддержку — разберём по
                  оферте. Чек приходит на email после оплаты.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
