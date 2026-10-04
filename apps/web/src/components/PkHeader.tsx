import { Link } from "react-router-dom";

export function PkHeader(props: { me?: { name?: string | null; email?: string } | null; onOut?: () => void }) {
  return (
    <div className="page-head">
      <header className="top wrap">
        <Link className="logo" to="/">
          Показо
        </Link>
        {props.me ? (
          <span>
            {props.me.name || props.me.email}{" "}
            <button type="button" className="pk ghost" onClick={props.onOut}>
              Выйти
            </button>
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
