import type { Pool, PoolClient } from "pg";
import { config } from "./env.js";
import { pool } from "./migrate.js";

export type BillingProduct = "credit_1" | "month_30";
export type BillingKind = "free" | "credit" | "month" | "off";
type StoredBillingKind = BillingKind | "released" | "refunded";
export type FinalizeBillingAction = "release_free" | "refund_credit" | "none";
export type BillingPrices = {
  creditRub: number;
  monthRub: number;
};

export type BillingCatalog = {
  paymentsEnabled: boolean;
  prices: BillingPrices;
};

export type BillingMe = BillingCatalog & {
  credits: number;
  freeAvailable: boolean;
  plan: "free" | "month";
  planUntil: string | null;
  label: string;
};

type BillingState = Omit<
  BillingMe,
  "label" | "prices" | "paymentsEnabled"
>;

type UserBillingRow = {
  credits: number;
  free_used: boolean;
  plan: string;
  plan_until: Date | null;
};

function requirePool(): Pool {
  if (!pool) throw new Error("DATABASE_URL is not set");
  return pool;
}

/** Grep: `docker logs … | grep '[billing] event='` */
export function billingLog(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
  error?: unknown,
): void {
  const extras = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value === null ? "null" : String(value)}`)
    .join(" ");
  const line = extras ? `[billing] event=${event} ${extras}` : `[billing] event=${event}`;
  if (level === "info") console.info(line);
  else if (level === "warn") console.warn(line);
  else if (error !== undefined) console.error(line, error);
  else console.error(line);
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** PDF/PPTX of a free-slot deck stay locked until an active month. Paid decks still download. */
export function deckFileDownloadAllowed(opts: {
  plan: "free" | "month";
  billingKind: string | null | undefined;
}): boolean {
  if (opts.plan === "month") return true;
  return opts.billingKind !== "free";
}

export function billingLabel(me: BillingState): string {
  if (me.plan === "month" && me.planUntil) {
    const until = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(me.planUntil));
    return `Безлимит до ${until}`;
  }
  if (me.freeAvailable) return "Осталось: 1 бесплатная";
  return `Осталось: ${me.credits} презентации`;
}

export function computeReserveKind(
  u: {
    free_used: boolean;
    credits: number;
    plan: string;
    plan_until: Date | null;
  },
  now = new Date(),
): BillingKind | "deny" {
  if (u.plan === "month" && u.plan_until && u.plan_until > now) return "month";
  if (!u.free_used) return "free";
  if (u.credits > 0) return "credit";
  return "deny";
}

export function computeFinalizeBillingAction(
  kind: StoredBillingKind | null,
  outcome: "ready" | "failed",
): FinalizeBillingAction {
  if (outcome === "failed" && kind === "free") return "release_free";
  if (outcome === "failed" && kind === "credit") return "refund_credit";
  return "none";
}

export function getBillingCatalog(): BillingCatalog {
  return {
    paymentsEnabled: config.paymentsEnabled,
    prices: {
      creditRub: config.priceCreditKopecks / 100,
      monthRub: config.priceMonthKopecks / 100,
    },
  };
}

export async function getBillingMe(userId: string): Promise<BillingMe> {
  const result = await requirePool().query<UserBillingRow>(
    `SELECT credits, free_used, plan, plan_until
       FROM "user"
      WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`User not found: ${userId}`);

  const planActive =
    row.plan === "month" &&
    row.plan_until !== null &&
    row.plan_until > new Date();
  const state: BillingState = {
    credits: row.credits,
    freeAvailable: !row.free_used,
    plan: planActive ? "month" : "free",
    planUntil: planActive ? toIso(row.plan_until) : null,
  };

  return {
    ...getBillingCatalog(),
    ...state,
    label: billingLabel(state),
  };
}

async function updateDeckKind(
  client: PoolClient,
  deckId: string,
  userId: string,
  kind: BillingKind,
): Promise<void> {
  const result = await client.query(
    `UPDATE deck
        SET billing_kind = $1
      WHERE id = $2 AND user_id = $3`,
    [kind, deckId, userId],
  );
  if (result.rowCount !== 1) throw new Error(`Deck not found: ${deckId}`);
}

export async function reserveGenerate(
  userId: string,
  deckId: string,
): Promise<
  { ok: true; kind: BillingKind } | { ok: false; code: "payment_required" }
> {
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<UserBillingRow>(
      `SELECT credits, free_used, plan, plan_until
         FROM "user"
        WHERE id = $1
        FOR UPDATE`,
      [userId],
    );
    const user = result.rows[0];
    if (!user) throw new Error(`User not found: ${userId}`);

    if (!config.paymentsEnabled) {
      await updateDeckKind(client, deckId, userId, "off");
      await client.query("COMMIT");
      billingLog("info", "reserve_ok", { userId, deckId, kind: "off", paymentsEnabled: false });
      return { ok: true, kind: "off" };
    }

    const kind = computeReserveKind(user);
    if (kind === "deny") {
      await client.query("COMMIT");
      billingLog("info", "reserve_denied", {
        userId,
        deckId,
        credits: user.credits,
        freeUsed: user.free_used,
        plan: user.plan,
      });
      return { ok: false, code: "payment_required" };
    }

    if (kind === "free") {
      await client.query(
        `UPDATE "user"
            SET free_used = true
          WHERE id = $1`,
        [userId],
      );
    } else if (kind === "credit") {
      await client.query(
        `UPDATE "user"
            SET credits = credits - 1
          WHERE id = $1`,
        [userId],
      );
    }
    await updateDeckKind(client, deckId, userId, kind);
    await client.query("COMMIT");
    billingLog("info", "reserve_ok", {
      userId,
      deckId,
      kind,
      creditsAfter: kind === "credit" ? user.credits - 1 : user.credits,
    });
    return { ok: true, kind };
  } catch (error) {
    await client.query("ROLLBACK");
    billingLog("error", "reserve_failed", { userId, deckId }, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function finalizeDeckBilling(
  deckId: string,
  outcome: "ready" | "failed",
): Promise<void> {
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      billing_kind: StoredBillingKind | null;
      user_id: string;
    }>(
      `SELECT billing_kind, user_id
         FROM deck
        WHERE id = $1
        FOR UPDATE`,
      [deckId],
    );
    const deck = result.rows[0];
    if (!deck) throw new Error(`Deck not found: ${deckId}`);

    const action = computeFinalizeBillingAction(deck.billing_kind, outcome);
    if (action === "release_free") {
      const released = await client.query<{ user_id: string }>(
        `UPDATE deck
            SET billing_kind = 'released'
          WHERE id = $1 AND billing_kind = 'free'
        RETURNING user_id`,
        [deckId],
      );
      const releasedUser = released.rows[0];
      if (releasedUser) {
        await client.query(
          `UPDATE "user" SET free_used = false WHERE id = $1`,
          [releasedUser.user_id],
        );
      }
    } else if (action === "refund_credit") {
      const refunded = await client.query<{ user_id: string }>(
        `UPDATE deck
            SET billing_kind = 'refunded'
          WHERE id = $1 AND billing_kind = 'credit'
        RETURNING user_id`,
        [deckId],
      );
      const refundedUser = refunded.rows[0];
      if (refundedUser) {
        await client.query(
          `UPDATE "user" SET credits = credits + 1 WHERE id = $1`,
          [refundedUser.user_id],
        );
      }
    }

    await client.query("COMMIT");
    billingLog("info", "finalize", {
      deckId,
      userId: deck.user_id,
      outcome,
      billingKind: deck.billing_kind,
      action,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    billingLog("error", "finalize_failed", { deckId, outcome }, error);
    throw error;
  } finally {
    client.release();
  }
}

export type ApplyPaidResult = "applied" | "already_paid";

export async function applyPaidPayment(
  paymentId: string,
  tochkaOperationId: string,
): Promise<ApplyPaidResult> {
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      status: string;
      product: BillingProduct;
      user_id: string;
    }>(
      `SELECT status, product, user_id
         FROM payment
        WHERE id = $1
        FOR UPDATE`,
      [paymentId],
    );
    const payment = result.rows[0];
    if (!payment) throw new Error(`Payment not found: ${paymentId}`);

    if (payment.status === "paid") {
      await client.query("COMMIT");
      billingLog("info", "already_paid", {
        paymentId,
        userId: payment.user_id,
        product: payment.product,
        operationId: tochkaOperationId,
      });
      return "already_paid";
    }

    if (payment.product === "credit_1") {
      await client.query(
        `UPDATE "user" SET credits = credits + 1 WHERE id = $1`,
        [payment.user_id],
      );
    } else if (payment.product === "month_30") {
      await client.query(
        `UPDATE "user"
            SET plan = 'month',
                plan_until = GREATEST(now(), COALESCE(plan_until, now()))
                             + INTERVAL '30 days'
          WHERE id = $1`,
        [payment.user_id],
      );
    } else {
      throw new Error(`Unsupported billing product: ${payment.product}`);
    }

    await client.query(
      `UPDATE payment
          SET status = 'paid',
              paid_at = now(),
              tochka_operation_id = $2
        WHERE id = $1`,
      [paymentId, tochkaOperationId],
    );
    await client.query("COMMIT");
    billingLog("info", "marked_paid", {
      paymentId,
      userId: payment.user_id,
      product: payment.product,
      operationId: tochkaOperationId,
      unlock: payment.product === "credit_1" ? "credit+1" : "month+30d",
    });
    return "applied";
  } catch (error) {
    await client.query("ROLLBACK");
    billingLog("error", "mark_paid_failed", { paymentId, operationId: tochkaOperationId }, error);
    throw error;
  } finally {
    client.release();
  }
}
