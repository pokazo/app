import { Link } from "react-router-dom";
import { APP_HISTORY_PATH } from "../decks";

export function PkHeader(props: { me?: { name?: string | null; email?: string } | null; onOut?: () => void }) {
  return (
    <div className="page-head">
      <header className="top wrap">
        <Link className="logo" to="/" aria-label="Показо">
          <img src="/favicon.svg" width="36" height="36" alt="" />
        </Link>
        {props.me ? (
          <span className="head-actions">
            <Link className="pk-btn ghost" to="/app">
              Создать
            </Link>
            <Link className="pk-btn ghost" to={APP_HISTORY_PATH}>
              История
            </Link>
            <span className="head-email">{props.me.name || props.me.email}</span>
            {props.onOut ? (
              <button type="button" className="pk ghost" onClick={props.onOut}>
                Выйти
              </button>
            ) : null}
          </span>
        ) : (
          <Link className="pk-btn ghost" to="/login" data-pk="cta-login">
            Войти
          </Link>
        )}
      </header>
    </div>
  );
}
