import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatBillingLabel } from "./billing";
import { PaywallModal } from "./components/PaywallModal";

describe("formatBillingLabel", () => {
  it("formats free", () => {
    expect(formatBillingLabel({ freeAvailable: true, credits: 0, plan: "free", planUntil: null })).toBe(
      "Осталось: 1 бесплатная",
    );
  });

  it("formats credits", () => {
    expect(formatBillingLabel({ freeAvailable: false, credits: 2, plan: "free", planUntil: null })).toBe(
      "Осталось: 2 презентации",
    );
  });

  it("formats an active monthly plan", () => {
    expect(
      formatBillingLabel({
        freeAvailable: false,
        credits: 0,
        plan: "month",
        planUntil: "2026-11-12T00:00:00.000Z",
      }),
    ).toBe("Безлимит до 12 ноября 2026 г.");
  });
});

describe("PaywallModal", () => {
  it("renders API-provided prices", () => {
    const html = renderToStaticMarkup(
      createElement(PaywallModal, {
        billing: {
          paymentsEnabled: true,
          freeAvailable: false,
          credits: 0,
          plan: "free",
          planUntil: null,
          label: "",
          prices: { creditRub: 249, monthRub: 499 },
        },
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("Ещё одна — 249 ₽");
    expect(html).toContain("Безлимит на месяц — 499 ₽");
  });
});
