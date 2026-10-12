import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { APP_HISTORY_PATH } from "../decks";
import { BillingMe, formatBillingLabel } from "../billing";

export function PkHeader(props: {
  me?: { name?: string | null; email?: string } | null;
  onOut?: () => void;
  /** When set (incl. null), skips the header's own /api/billing/me fetch. */
  billing?: BillingMe | null;
}) {
  const [billing, setBilling] = useState<BillingMe | null>(props.billing ?? null);

  useEffect(() => {
    if (props.billing !== undefined) {
      setBilling(props.billing);
      return;
    }
    if (!props.me) {
      setBilling(null);
      return;
    }
    let cancelled = false;
    void api<BillingMe>("/api/billing/me")
      .then((current) => {
        if (!cancelled) setBilling(current);
      })
      .catch(() => {
        if (!cancelled) setBilling(null);
      });
    return () => {
      cancelled = true;
    };
  }, [props.me, props.billing]);

  const label = props.me?.name || props.me?.email || "Профиль";

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
            <details className="head-profile">
              <summary className="head-profile-summary">
                <span className="head-email">{label}</span>
              </summary>
              <div className="head-profile-menu" role="menu">
                {billing?.paymentsEnabled ? (
                  <p className="head-profile-billing" role="menuitem">
                    {formatBillingLabel(billing)}
                  </p>
                ) : null}
                {props.onOut ? (
                  <button type="button" className="pk ghost head-profile-out" role="menuitem" onClick={props.onOut}>
                    Выйти
                  </button>
                ) : null}
              </div>
            </details>
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
