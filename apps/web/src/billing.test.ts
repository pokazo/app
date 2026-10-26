import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatBillingLabel, deckFileDownloadAllowed } from "./billing";
import { PaywallModal } from "./components/PaywallModal";
import { MemoryRouter } from "react-router-dom";
import { Pricing } from "./pages/Pricing";

describe("deckFileDownloadAllowed", () => {
  it("blocks a free-slot deck and allows a paid month", () => {
    expect(deckFileDownloadAllowed({ plan: "free", billingKind: "free" })).toBe(false);
    expect(deckFileDownloadAllowed({ plan: "month", billingKind: "free" })).toBe(true);
    expect(deckFileDownloadAllowed({ plan: "free", billingKind: "credit" })).toBe(true);
  });
});

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

describe("Pricing page", () => {
  it("renders API-provided prices", () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(Pricing, {
          catalog: { paymentsEnabled: true, prices: { creditRub: 249, monthRub: 499 } },
        }),
      ),
    );
    expect(html).toContain("249");
    expect(html).toContain("499");
    expect(html).toContain("<h1>Тарифы</h1>");
    expect(html).not.toContain("экспорт PDF");
  });

  it("explains why a free export landed here", () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ["/pricing?reason=export"] },
        createElement(Pricing, {
          catalog: { paymentsEnabled: true, prices: { creditRub: 249, monthRub: 499 } },
        }),
      ),
    );
    expect(html).toContain("PDF и PPTX скачиваются на платном тарифе");
  });
});
