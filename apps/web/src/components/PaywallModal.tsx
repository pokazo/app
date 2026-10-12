import { useEffect, useState } from "react";
import { api } from "../api";
import type { BillingMe, BillingProduct } from "../billing";
import { PkButton } from "./PkButton";

type CheckoutResponse = { paymentUrl: string };

export function PaywallModal({ billing, onClose }: { billing: BillingMe; onClose: () => void }) {
  const [pending, setPending] = useState<BillingProduct | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function checkout(product: BillingProduct) {
    setPending(product);
    setError("");
    try {
      const result = await api<CheckoutResponse>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ product }),
      });
      window.location.href = result.paymentUrl;
    } catch {
      setError("Не удалось перейти к оплате. Попробуйте ещё раз.");
      setPending(null);
    }
  }

  return (
    <div className="paywall-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="paywall-modal" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <button className="paywall-close" type="button" aria-label="Закрыть" onClick={onClose}>
          ×
        </button>
        <h2 id="paywall-title">Нужна ещё одна презентация</h2>
        <div className="paywall-actions">
          <PkButton disabled={pending !== null} onClick={() => checkout("credit_1")}>
            {pending === "credit_1" ? "Переходим…" : `Ещё одна — ${billing.prices.creditRub} ₽`}
          </PkButton>
          <PkButton variant="ghost" disabled={pending !== null} onClick={() => checkout("month_30")}>
            {pending === "month_30" ? "Переходим…" : `Безлимит на месяц — ${billing.prices.monthRub} ₽`}
          </PkButton>
        </div>
        {error ? <p className="err paywall-error">{error}</p> : null}
      </section>
    </div>
  );
}
