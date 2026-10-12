# Tochka Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate deck generation behind billing: 1 free ready deck per user, then 199 ₽/credit or 399 ₽/30-day month via Tochka payment links (gosphoto pattern).

**Architecture:** Postgres quota columns on `"user"` + `payment` rows; `billing.ts` reserves charge at `POST /api/decks`; `tochka.ts` creates links and verifies webhooks; queue refunds credits / finalizes free on ready|failed. Web shows balance + paywall modal. Flag `PAYMENTS_ENABLED=false` keeps current unlimited behavior.

**Tech Stack:** Hono, Postgres (`pg`), Vitest, React/Vite, Tochka Open API (`enter.tochka.com`), `jose` for webhook JWT RS256.

**Spec:** `docs/superpowers/specs/2026-10-12-payments-tochka-design.md`  
**Reference:** `gosphoto-api` (`app/tochka.py`, `app/payments.py`, `docs/payments-tochka.md`)

## Global Constraints

- Gateway: Tochka only (no YooKassa/CloudPayments/Stripe)
- Free = 1 deck reaching `ready` per `user_id`; failed does not spend free
- Credit consumed at enqueue; refunded if job ends `failed`
- Month plan: unlimited generates while `plan_until > now`
- Rewrite / speech / export do not consume credits in v1
- `PAYMENTS_ENABLED=false` → no gate (prod default until live token)
- Prices via env: `PRICE_CREDIT_KOPECKS=19900`, `PRICE_MONTH_KOPECKS=39900`
- TDD: failing test before production code each task
- Do not commit unless user asks
- Russian UI copy as in tasks

## File map

| File | Role |
|------|------|
| `apps/api/src/env.ts` | Tochka + billing env |
| `apps/api/src/schema.ts` | ALTER user + CREATE payment |
| `apps/api/src/migrate.ts` | unchanged entrypoint (runs SCHEMA_SQL) |
| `apps/api/src/billing.ts` | quotas, reserve, apply paid, me DTO |
| `apps/api/src/billing.test.ts` | quota + reserve + applyPaid |
| `apps/api/src/tochka.ts` | client + stub + webhook parse |
| `apps/api/src/tochka.test.ts` | stub create + JWT/json parse |
| `apps/api/src/app.ts` | `/api/billing/*`, webhook, gate on POST decks |
| `apps/api/src/queue.ts` | finalize billing on ready/failed |
| `apps/api/src/billing-http.test.ts` | route smoke with stub |
| `apps/web/src/billing.ts` | types + label helper |
| `apps/web/src/billing.test.ts` | label helper |
| `apps/web/src/components/PaywallModal.tsx` | 199 / 399 CTAs |
| `apps/web/src/pages/AppHome.tsx` | balance + 402 → modal |
| `apps/web/src/pages/Legal.tsx` + seo bodies | offer/privacy text |
| `apps/api/package.json` | add `jose` |

---

### Task 1: Env + schema columns

**Files:**
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/src/schema.ts`
- Create: `apps/api/src/billing-schema.test.ts`

**Interfaces:**
- Produces: `config.paymentsEnabled`, `config.tochka*`, `config.priceCreditKopecks`, `config.priceMonthKopecks`, `config.billingFreeUnlock`, `config.publicBaseUrl`
- Produces SQL that adds user billing cols + `payment` table (idempotent)

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/billing-schema.test.ts
import { describe, expect, it } from "vitest";
import { SCHEMA_SQL } from "./schema.js";

describe("billing schema", () => {
  it("adds user billing columns and payment table", () => {
    expect(SCHEMA_SQL).toMatch(/credits\s+INT/i);
    expect(SCHEMA_SQL).toMatch(/free_used/i);
    expect(SCHEMA_SQL).toMatch(/plan_until/i);
    expect(SCHEMA_SQL).toMatch(/CREATE TABLE IF NOT EXISTS payment/i);
    expect(SCHEMA_SQL).toMatch(/billing_kind/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm exec vitest run src/billing-schema.test.ts`
Expected: FAIL (columns missing from SCHEMA_SQL)

- [ ] **Step 3: Extend env + schema**

Append to `config` in `env.ts`:

```ts
  publicBaseUrl: env("PUBLIC_BASE_URL", "http://localhost:5173"),
  paymentsEnabled: env("PAYMENTS_ENABLED", "false") === "true",
  billingFreeUnlock: env("BILLING_FREE_UNLOCK", "false") === "true",
  tochkaAccessToken: env("TOCHKA_ACCESS_TOKEN"),
  tochkaCustomerCode: env("TOCHKA_CUSTOMER_CODE"),
  tochkaMerchantId: env("TOCHKA_MERCHANT_ID"),
  tochkaApiBaseUrl: env("TOCHKA_API_BASE_URL", "https://enter.tochka.com"),
  priceCreditKopecks: Number(env("PRICE_CREDIT_KOPECKS", "19900")),
  priceMonthKopecks: Number(env("PRICE_MONTH_KOPECKS", "39900")),
```

Append to `SCHEMA_SQL` (after existing tables; `CREATE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`):

```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS credits INT NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS free_used BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan_until TIMESTAMP;

ALTER TABLE deck ADD COLUMN IF NOT EXISTS billing_kind TEXT;

CREATE TABLE IF NOT EXISTS payment (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  amount_kopecks INT NOT NULL,
  status TEXT NOT NULL,
  tochka_operation_id TEXT,
  payment_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  paid_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS payment_user_idx ON payment(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_tochka_op_uidx
  ON payment(tochka_operation_id) WHERE tochka_operation_id IS NOT NULL;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm exec vitest run src/billing-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add apps/api/src/env.ts apps/api/src/schema.ts apps/api/src/billing-schema.test.ts
git commit -m "feat(api): add billing schema and Tochka env"
```

---

### Task 2: Quota helpers (no HTTP)

**Files:**
- Create: `apps/api/src/billing.ts`
- Create: `apps/api/src/billing.test.ts`

**Interfaces:**
- Produces:
  - `export type BillingProduct = "credit_1" | "month_30"`
  - `export type BillingKind = "free" | "credit" | "month" | "off"`
  - `export type BillingMe = { paymentsEnabled: boolean; credits: number; freeAvailable: boolean; plan: "free" | "month"; planUntil: string | null; label: string; prices: { creditRub: number; monthRub: number } }`
  - `export function billingLabel(me: Omit<BillingMe, "label" | "prices" | "paymentsEnabled">): string`
  - `export async function getBillingMe(userId: string): Promise<BillingMe>`
  - `export async function reserveGenerate(userId: string, deckId: string): Promise<{ ok: true; kind: BillingKind } | { ok: false; code: "payment_required" }>`
  - `export async function finalizeDeckBilling(deckId: string, outcome: "ready" | "failed"): Promise<void>`
  - `export async function applyPaidPayment(paymentId: string, tochkaOperationId: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/api/src/billing.test.ts
import { describe, expect, it } from "vitest";
import { billingLabel } from "./billing.js";

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
```

- [ ] **Step 2: Run — expect FAIL** (`billing` missing)

Run: `cd apps/api && pnpm exec vitest run src/billing.test.ts`

- [ ] **Step 3: Implement `billing.ts` (label + DB ops)**

Core rules for `reserveGenerate` (single transaction, `SELECT … FOR UPDATE` on user):

1. If `!config.paymentsEnabled` → set `deck.billing_kind='off'`, return `{ ok:true, kind:'off' }`
2. If `plan==='month' && plan_until > now` → `billing_kind='month'`
3. Else if `!free_used` → `billing_kind='free'` (do not set `free_used` yet)
4. Else if `credits > 0` → `credits -= 1`, `billing_kind='credit'`
5. Else → `{ ok:false, code:'payment_required' }`

`finalizeDeckBilling`:

- Load deck `billing_kind` + `user_id`
- `ready` + `free` → `UPDATE user SET free_used=true`
- `failed` + `credit` → `UPDATE user SET credits = credits + 1`
- `failed` + `free` → no-op (`free_used` stays false)

`applyPaidPayment`:

- If already `paid`, return
- `credit_1` → `credits += 1`
- `month_30` → `plan='month'`, `plan_until = greatest(now, plan_until) + 30 days`
- Set `status='paid'`, `paid_at=now()`, store `tochka_operation_id`

`getBillingMe`: map row → DTO; `freeAvailable = !free_used`; if month active expose `plan:'month'`.

- [ ] **Step 4: Add DB integration tests** (skip if no `DATABASE_URL` in vitest, or use existing test pool pattern from repo). Minimum: keep unit tests for `billingLabel`; add one mocked-pool test OR document that reserve/finalize are covered in Task 4 HTTP test with real pool when available.

Extend `billing.test.ts` with pure helpers if you extract `computeReserveKind(user, now): BillingKind | "deny"`.

```ts
export function computeReserveKind(u: {
  free_used: boolean;
  credits: number;
  plan: string;
  plan_until: Date | null;
}, now = new Date()): BillingKind | "deny" {
  if (u.plan === "month" && u.plan_until && u.plan_until > now) return "month";
  if (!u.free_used) return "free";
  if (u.credits > 0) return "credit";
  return "deny";
}
```

Test `computeReserveKind` exhaustively.

- [ ] **Step 5: Run tests PASS**

Run: `cd apps/api && pnpm exec vitest run src/billing.test.ts`

- [ ] **Step 6: Commit** (if asked)

```bash
git add apps/api/src/billing.ts apps/api/src/billing.test.ts
git commit -m "feat(api): billing quota reserve and finalize"
```

---

### Task 3: Tochka client + webhook parse

**Files:**
- Create: `apps/api/src/tochka.ts`
- Create: `apps/api/src/tochka.test.ts`
- Modify: `apps/api/package.json` — dependency `jose`

**Interfaces:**
- Produces:
  - `export class TochkaError extends Error`
  - `export type TochkaPayment = { operationId: string; paymentUrl: string }`
  - `export interface TochkaClient { createPaymentLink(opts: { amountKopecks: number; purpose: string; paymentId: string; failRedirectUrl: string; successRedirectUrl: string }): Promise<TochkaPayment> }`
  - `export class StubTochkaClient implements TochkaClient`
  - `export class HttpTochkaClient implements TochkaClient`
  - `export function getTochkaClient(): TochkaClient`
  - `export function parseTochkaWebhook(rawBody: string): { operationId: string | null; paymentLinkId: string | null; status: string } | null`
  - `export function isTochkaPaidStatus(status: string): boolean` — true for `PAID|SUCCESS|APPROVED`

- [ ] **Step 1: Add jose**

```bash
cd apps/api && pnpm add jose
```

- [ ] **Step 2: Failing tests**

```ts
// apps/api/src/tochka.test.ts
import { describe, expect, it } from "vitest";
import { StubTochkaClient, isTochkaPaidStatus, parseTochkaWebhook } from "./tochka.js";

describe("StubTochkaClient", () => {
  it("returns a fake payment url", async () => {
    const c = new StubTochkaClient();
    const p = await c.createPaymentLink({
      amountKopecks: 19900,
      purpose: "Показо: 1 презентация",
      paymentId: "pay1",
      failRedirectUrl: "http://localhost/app",
      successRedirectUrl: "http://localhost/app?paid=1",
    });
    expect(p.operationId).toBeTruthy();
    expect(p.paymentUrl).toContain("stub");
  });
});

describe("parseTochkaWebhook", () => {
  it("parses JSON body", () => {
    const ev = parseTochkaWebhook(
      JSON.stringify({ operationId: "op-1", status: "APPROVED", paymentLinkId: "pl-1" }),
    );
    expect(ev?.operationId).toBe("op-1");
    expect(isTochkaPaidStatus(ev!.status)).toBe(true);
  });
});
```

- [ ] **Step 3: Implement** — port public key + JWT verify from gosphoto `parse_webhook_jwt` using `jose.importJWK` / `jwtVerify`. `getTochkaClient()`: empty token → Stub; else Http.

Http create: follow gosphoto `HttpTochkaClient.create_payment` against `${tochkaApiBaseUrl}/uapi/...` (copy path/fields from gosphoto; purpose + amount + redirects + metadata `payment_id`).

- [ ] **Step 4: Tests PASS**

Run: `cd apps/api && pnpm exec vitest run src/tochka.test.ts`

- [ ] **Step 5: Commit** (if asked)

---

### Task 4: HTTP routes + gate on POST /api/decks

**Files:**
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/billing-http.test.ts`
- Modify: `apps/api/src/queue.ts` — call `finalizeDeckBilling` on ready/failed

**Interfaces:**
- Produces routes:
  - `GET /api/billing/me` → `BillingMe` (401 if no session)
  - `POST /api/billing/checkout` body `{ product: "credit_1" | "month_30" }` → `{ paymentId, paymentUrl, amountKopecks }`
  - `POST /api/payments/tochka/webhook` → 200 always when parsed; apply paid
  - `POST /api/decks` → on reserve fail: **402** `{ error: "payment_required", billing: BillingMe }`

- [ ] **Step 1: Failing HTTP test** (pattern from `health.test.ts` — build app, no auth → 401 billing/me)

```ts
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("billing http", () => {
  it("billing/me requires auth", async () => {
    const app = createApp();
    const res = await app.request("/api/billing/me");
    expect([401, 503]).toContain(res.status);
  });

  it("webhook accepts JSON APPROVED without crashing", async () => {
    const app = createApp();
    const res = await app.request("/api/payments/tochka/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationId: "missing", status: "APPROVED" }),
    });
    expect(res.status).toBeLessThan(500);
  });
});
```

- [ ] **Step 2: Wire routes in `app.ts`**

Checkout flow:

1. Auth required
2. Insert `payment` pending
3. If `billingFreeUnlock` → `applyPaidPayment` immediately, return `{ paymentUrl: successRedirect }`
4. Else `getTochkaClient().createPaymentLink(...)` with  
   `successRedirectUrl = ${publicBaseUrl}/app?paid=1`  
   `failRedirectUrl = ${publicBaseUrl}/app?paid=0`
5. Store `payment_url` + `tochka_operation_id`

Gate in `POST /api/decks` **after** INSERT deck, **before** `enqueueDeck`:

```ts
const reserved = await reserveGenerate(session.user.id, id);
if (!reserved.ok) {
  await pool.query(`DELETE FROM deck WHERE id=$1`, [id]);
  const billing = await getBillingMe(session.user.id);
  return c.json({ error: "payment_required", billing }, 402);
}
```

In `processDeck` after ready / in catch after failed:

```ts
await finalizeDeckBilling(id, "ready"); // or "failed"
```

- [ ] **Step 3: Tests PASS**

Run: `cd apps/api && pnpm test` (full suite; fix breakages)

- [ ] **Step 4: Commit** (if asked)

---

### Task 5: Web paywall UI

**Files:**
- Create: `apps/web/src/billing.ts`
- Create: `apps/web/src/billing.test.ts`
- Create: `apps/web/src/components/PaywallModal.tsx`
- Modify: `apps/web/src/pages/AppHome.tsx`
- Modify: `apps/web/src/styles/global.css` (modal — reuse deck modal patterns if any)

**Interfaces:**
- Consumes: `GET /api/billing/me`, `POST /api/billing/checkout`, 402 from `/api/decks`
- Produces: balance line + modal

- [ ] **Step 1: Failing test for label** (mirror api `billingLabel` in web or import shared copy — duplicate small helper in `apps/web/src/billing.ts`)

```ts
import { describe, expect, it } from "vitest";
import { formatBillingLabel } from "./billing";

describe("formatBillingLabel", () => {
  it("formats free", () => {
    expect(formatBillingLabel({ freeAvailable: true, credits: 0, plan: "free", planUntil: null })).toBe(
      "Осталось: 1 бесплатная",
    );
  });
});
```

- [ ] **Step 2: Implement helper + PaywallModal**

Modal copy:

- Title: `Нужна ещё одна презентация`
- Primary: `Ещё одна — 199 ₽` → checkout `credit_1` → `location.href = paymentUrl`
- Secondary: `Безлимит на месяц — 399 ₽` → `month_30`
- Note: prices from `billing.prices` not hardcoded

- [ ] **Step 3: AppHome**

- Fetch `/api/billing/me` with session
- Show `<p className="billing-balance">{label}</p>` under h1 when `paymentsEnabled`
- On create: if response 402, open modal (parse JSON); do not show generic «Не удалось создать»
- If `?paid=1`, refetch billing/me and clear query

Handle 402 in `api()` helper or special-case fetch in `onCreate`.

- [ ] **Step 4: Web tests PASS**

Run: `cd apps/web && pnpm test`

- [ ] **Step 5: Commit** (if asked)

---

### Task 6: Legal texts

**Files:**
- Modify: `apps/web/src/pages/Legal.tsx`
- Modify: `apps/web/seo/offer-body.html`
- Modify: `apps/web/seo/privacy-body.html`

**Interfaces:**
- Produces: non-placeholder offer + privacy mentioning ИП Бутов Антон Сергеевич, ИНН/ОГРНИП from footer, prices 199/399, digital service, Tochka as payment provider, 54-FZ receipt to email

- [ ] **Step 1: Replace stub bodies** with short real Russian legal text (1–2 screens). Include:

  - Исполнитель: ИП Бутов Антон Сергеевич, ИНН 614302304615, ОГРНИП 326619600045863
  - Услуга: генерация цифровой презентации (доступ в браузере)
  - Момент оказания: статус готовой колоды
  - Тарифы: 1 бесплатно; 199 ₽; 399 ₽ / 30 дней
  - Оплата: Точка Банк; чек по 54-ФЗ

- [ ] **Step 2: Run seo-build test**

Run: `cd apps/web && node scripts/seo-build.test.mjs`

- [ ] **Step 3: Commit** (if asked)

---

### Task 7: Ops checklist (no code)

**Files:**
- Create: `docs/payments-tochka.md` (short checklist like gosphoto)

- [ ] **Step 1: Write checklist**

Contents:

- Env vars table from spec
- Webhook URL `https://api.pokazo.ru/api/payments/tochka/webhook`
- Enable `PAYMENTS_ENABLED=true` only after offer live + token set
- Smoke: stub local → 1 ₽ Tochka test → refund → live 199 ₽
- Reuse same Tochka JWT as gosphoto if same ИП merchant (confirm in bank UI)

- [ ] **Step 2: Commit** (if asked)

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| 1 free ready deck | 2, 4 |
| 199 credit / 399 month | 1, 3, 4, 5 |
| Tochka link + webhook | 3, 4 |
| Gate before generate | 4 |
| Refund credit on fail | 2, 4 |
| Rewrite free | 4 (no gate on rewrite routes) |
| UI balance + modal | 5 |
| Offer/privacy | 6 |
| PAYMENTS_ENABLED flag | 1, 2, 4 |
| Ops / live token | 7 |
| Recurring /pricing v2 | out of scope |

## Placeholder scan

None intentional. HttpTochka create path must be copied from gosphoto at implement time (exact uapi path in `tochka.py` `create_payment`).
