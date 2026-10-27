import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDetailsElement>(null);
  const drawerId = useId();
  const path = useLocation().pathname;

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

  useEffect(() => {
    if (!props.me) return;
    const onPointerDown = (event: PointerEvent) => {
      const el = profileRef.current;
      if (!el?.open) return;
      if (event.target instanceof Node && el.contains(event.target)) return;
      el.open = false;
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [props.me]);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const label = props.me?.name || props.me?.email || "Профиль";
  const onHome = path === "/";
  const onPricing = path === "/pricing";
  const closeMenu = () => setMenuOpen(false);

  const navLinks = (
    <>
      {onPricing ? null : (
        <Link className="pk-btn ghost" to="/pricing" data-pk="cta-pricing-nav" onClick={closeMenu}>
          Тарифы
        </Link>
      )}
      {props.me && !onHome ? (
        <Link className="pk-btn ghost" to="/app" onClick={closeMenu}>
          Создать
        </Link>
      ) : null}
      {props.me ? (
        <Link className="pk-btn ghost" to={APP_HISTORY_PATH} onClick={closeMenu}>
          История
        </Link>
      ) : null}
      {!props.me ? (
        <Link className="pk-btn ghost" to="/login" data-pk="cta-login" onClick={closeMenu}>
          Войти
        </Link>
      ) : null}
    </>
  );

  return (
    <div className={`page-head${menuOpen ? " is-menu-open" : ""}`}>
      <header className="top wrap">
        <Link className="logo" to="/" aria-label="Показо" onClick={closeMenu}>
          <img src="/favicon.svg" width="36" height="36" alt="" />
        </Link>
        <span className="head-actions head-actions--desktop">
          {navLinks}
          {props.me ? (
            <details ref={profileRef} className="head-profile">
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
          ) : null}
        </span>
        <button
          type="button"
          className={`head-burger${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          aria-controls={drawerId}
          data-pk="nav-burger"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="head-burger-bars" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </button>
      </header>
      {menuOpen ? (
        <div className="head-drawer" id={drawerId} role="dialog" aria-modal="true" aria-label="Меню">
          <nav className="head-drawer-nav wrap">{navLinks}</nav>
          {props.me ? (
            <div className="head-drawer-profile wrap">
              <p className="head-drawer-email">{label}</p>
              {billing?.paymentsEnabled ? (
                <p className="head-profile-billing">{formatBillingLabel(billing)}</p>
              ) : null}
              {props.onOut ? (
                <button
                  type="button"
                  className="pk ghost head-profile-out"
                  onClick={() => {
                    closeMenu();
                    props.onOut?.();
                  }}
                >
                  Выйти
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
