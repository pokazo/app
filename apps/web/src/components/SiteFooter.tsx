/** Shared legal footer for marketing pages. */
export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <p className="foot-links">
          <a href="/legal/offer">Оферта</a>
          {" · "}
          <a href="/legal/privacy">Персональные данные</a>
        </p>
        <p className="foot-ip">
          ИП Бутов Антон Сергеевич · ИНН 614302304615 · ОГРНИП 326619600045863
        </p>
      </div>
    </footer>
  );
}
