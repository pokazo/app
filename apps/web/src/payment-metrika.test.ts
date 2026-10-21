import { describe, expect, it } from "vitest";
import { inferPaymentSuccessGoal } from "./payment-metrika";

describe("inferPaymentSuccessGoal", () => {
  const base = { credits: 0, freeAvailable: false, plan: "free" as const, planUntil: null };

  it("detects credit purchase", () => {
    expect(inferPaymentSuccessGoal(base, { ...base, credits: 1 })).toBe("payment-paid-credit");
  });

  it("detects month plan activation", () => {
    expect(
      inferPaymentSuccessGoal(base, {
        ...base,
        plan: "month",
        planUntil: "2026-11-20T00:00:00.000Z",
      }),
    ).toBe("payment-paid-month");
  });

  it("detects month plan renewal", () => {
    const before = {
      ...base,
      plan: "month" as const,
      planUntil: "2026-10-20T00:00:00.000Z",
    };
    expect(
      inferPaymentSuccessGoal(before, {
        ...before,
        planUntil: "2026-11-20T00:00:00.000Z",
      }),
    ).toBe("payment-paid-month");
  });

  it("returns null when billing unchanged", () => {
    expect(inferPaymentSuccessGoal(base, base)).toBeNull();
  });
});
