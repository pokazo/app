# Task 4 report

Implemented billing HTTP routes and generation billing lifecycle:

- Added authenticated `GET /api/billing/me`.
- Added authenticated `POST /api/billing/checkout` for `credit_1` and `month_30`, including pending payment persistence, free-unlock handling, Tochka link creation, and operation/link persistence.
- Added async Tochka webhook parsing and idempotent paid-payment application by operation ID or payment ID.
- Added generation reservation after deck insert and before uploads/enqueue; denied reservations delete the deck and return HTTP 402 with current billing state.
- Added billing finalization for both ready and failed deck processing.
- Added HTTP route tests; verified the tests failed before route implementation and passed afterward.

Verification:

- `cd apps/api && pnpm test -- src/billing-http.test.ts` — 3 passed.
- `cd apps/api && pnpm build` — passed.
- `cd apps/api && pnpm test` — 56 files passed, 1 skipped; 328 tests passed, 5 skipped.
- IDE diagnostics and `git diff --check` — clean.

## Review follow-up

- Production Tochka webhooks now require a verified JWT. Unsigned JSON is
  accepted only for free-unlock or tokenless development/stub configurations.
- Verified webhook events resolve payments only by `tochka_operation_id`;
  stub JSON has a separate payment-ID lookup path.
- Failed upload persistence after quota reservation finalizes the deck as
  failed, releasing/refunding its billing reservation before the request fails.
- Successful generation marks the deck ready before billing finalization.
  A ready-finalization error is logged without changing the deck to failed or
  refunding it; generation failures retain failed finalization.

### Review follow-up verification

- Added HTTP coverage proving unsigned JSON is rejected when a Tochka token is
  configured and free unlock is disabled.
- Focused billing/Tochka suites: `38 passed`.
- API TypeScript check: passed.
- Full API suite: `329 passed, 5 skipped`.
- IDE diagnostics and `git diff --check`: passed.
