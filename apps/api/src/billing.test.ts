import { describe, expect, it } from "vitest";
import {
  billingLabel,
  computeFinalizeBillingAction,
  computeReserveKind,
  deckFileDownloadAllowed,
} from "./billing.js";

describe("deckFileDownloadAllowed", () => {
  it("blocks a free-slot deck on the free plan", () => {
    expect(deckFileDownloadAllowed({ plan: "free", billingKind: "free" })).toBe(false);
  });

  it("allows a free-slot deck while a month is active", () => {
    expect(deckFileDownloadAllowed({ plan: "month", billingKind: "free" })).toBe(true);
  });

  it("allows a credit deck and decks that are not the free slot", () => {
    expect(deckFileDownloadAllowed({ plan: "free", billingKind: "credit" })).toBe(true);
    expect(deckFileDownloadAllowed({ plan: "free", billingKind: "month" })).toBe(true);
    expect(deckFileDownloadAllowed({ plan: "free", billingKind: "off" })).toBe(true);
    expect(deckFileDownloadAllowed({ plan: "free", billingKind: null })).toBe(true);
  });
});

describe("billingLabel", () => {
  it("shows free available", () => {
    expect(
      billingLabel({
        credits: 0,
        freeAvailable: true,
        plan: "free",
        planUntil: null,
      }),
    ).toBe("Осталось: 1 бесплатная");
  });

  it("shows credits", () => {
    expect(
      billingLabel({
        credits: 2,
        freeAvailable: false,
        plan: "free",
        planUntil: null,
      }),
    ).toBe("Осталось: 2 презентации");
  });

  it("shows month", () => {
    expect(
      billingLabel({
        credits: 0,
        freeAvailable: false,
        plan: "month",
        planUntil: "2026-11-12T00:00:00.000Z",
      }),
    ).toMatch(/^Безлимит до /);
  });
});

describe("computeReserveKind", () => {
  const now = new Date("2026-10-12T12:00:00.000Z");

  it("prioritizes an active month plan", () => {
    expect(
      computeReserveKind(
        {
          free_used: false,
          credits: 2,
          plan: "month",
          plan_until: new Date("2026-10-13T12:00:00.000Z"),
        },
        now,
      ),
    ).toBe("month");
  });

  it("uses free quota before credits", () => {
    expect(
      computeReserveKind(
        {
          free_used: false,
          credits: 2,
          plan: "free",
          plan_until: null,
        },
        now,
      ),
    ).toBe("free");
  });

  it("uses a credit after free quota", () => {
    expect(
      computeReserveKind(
        {
          free_used: true,
          credits: 1,
          plan: "free",
          plan_until: null,
        },
        now,
      ),
    ).toBe("credit");
  });

  it("denies when no quota remains", () => {
    expect(
      computeReserveKind(
        {
          free_used: true,
          credits: 0,
          plan: "free",
          plan_until: null,
        },
        now,
      ),
    ).toBe("deny");
  });

  it.each([
    ["expired", new Date("2026-10-12T11:59:59.999Z")],
    ["ending now", now],
    ["missing expiry", null],
  ])("does not use a month plan with %s", (_case, planUntil) => {
    expect(
      computeReserveKind(
        {
          free_used: true,
          credits: 1,
          plan: "month",
          plan_until: planUntil,
        },
        now,
      ),
    ).toBe("credit");
  });
});

describe("computeFinalizeBillingAction", () => {
  it("releases an optimistically reserved free generation on failure", () => {
    expect(computeFinalizeBillingAction("free", "failed")).toBe(
      "release_free",
    );
  });

  it("refunds a charged credit on failure", () => {
    expect(computeFinalizeBillingAction("credit", "failed")).toBe(
      "refund_credit",
    );
  });

  it.each([
    ["free", "ready"],
    ["credit", "ready"],
    ["month", "failed"],
    ["off", "failed"],
    ["released", "failed"],
    ["refunded", "failed"],
    [null, "failed"],
  ] as const)("does nothing for %s + %s", (kind, outcome) => {
    expect(computeFinalizeBillingAction(kind, outcome)).toBe("none");
  });
});
