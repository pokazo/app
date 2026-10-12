import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = vi.fn();
  const release = vi.fn();
  return {
    query,
    release,
    pool: {
      connect: vi.fn(async () => ({ query, release })),
    },
  };
});

vi.mock("./migrate.js", () => ({ pool: mocks.pool }));

import { applyPaidPayment, finalizeDeckBilling } from "./billing.js";

describe("finalizeDeckBilling free transitions", () => {
  let billingKind: string;
  let freeUsed: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    billingKind = "free";
    freeUsed = true;

    mocks.query.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [], rowCount: null };
      }
      if (sql.includes("SELECT billing_kind, user_id")) {
        return {
          rows: [{ billing_kind: billingKind, user_id: "user-1" }],
          rowCount: 1,
        };
      }
      if (sql.includes("SET billing_kind = 'released'")) {
        if (billingKind !== "free") return { rows: [], rowCount: 0 };
        billingKind = "released";
        return { rows: [{ user_id: "user-1" }], rowCount: 1 };
      }
      if (sql.includes("SET free_used = false")) {
        freeUsed = false;
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });
  });

  it("releases free only once and preserves a newer reservation on replay", async () => {
    await finalizeDeckBilling("deck-1", "failed");

    expect(billingKind).toBe("released");
    expect(freeUsed).toBe(false);

    freeUsed = true; // A newer deck reserves the user's free generation.
    await finalizeDeckBilling("deck-1", "failed");

    expect(billingKind).toBe("released");
    expect(freeUsed).toBe(true);
  });

  it("keeps the free reservation consumed when the deck becomes ready", async () => {
    await finalizeDeckBilling("deck-1", "ready");

    expect(billingKind).toBe("free");
    expect(freeUsed).toBe(true);
  });
});

describe("applyPaidPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["credit_1", "credits = credits + 1"],
    ["month_30", "SET plan = 'month'"],
  ] as const)("applies %s and marks the payment paid", async (product, entitlementSql) => {
    const queries: string[] = [];
    mocks.query.mockImplementation(async (sql: string) => {
      queries.push(sql);
      if (sql.includes("SELECT status, product, user_id")) {
        return {
          rows: [{ status: "pending", product, user_id: "user-1" }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await applyPaidPayment("payment-1", "operation-1");

    expect(queries.some((sql) => sql.includes(entitlementSql))).toBe(true);
    expect(queries.some((sql) => sql.includes("SET status = 'paid'"))).toBe(true);
    expect(queries.at(-1)).toBe("COMMIT");
  });
});
