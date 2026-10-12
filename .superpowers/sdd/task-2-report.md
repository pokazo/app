# Task 2 Report: Quota helpers

## Status

Complete.

## Implementation

- Added billing DTO/types and Russian quota labels.
- Added pure `computeReserveKind` quota precedence logic.
- Added transactional quota reservation and deck billing finalization.
- Added idempotent paid-payment application for credit and monthly products.
- Added billing-state mapping with configured prices and payment availability.

## Tests

- TDD red: focused suite initially failed because `billing.ts` did not exist.
- Focused: `10 passed` in `src/billing.test.ts`.
- TypeScript: `pnpm exec tsc -p tsconfig.json --noEmit` passed.
- Full API: `53 passed, 1 skipped`; `301 passed, 5 skipped`.
- IDE diagnostics: no errors in the two billing files.

## Coverage note

`DATABASE_URL` is unavailable in the test environment, so DB integration tests
were not added. Transactional DB paths should be covered by the Task 4 HTTP
integration test with a real pool, as permitted by the brief.

## Commit

`feat(api): billing quota reserve and finalize`

## Critical race follow-up

- `reserveGenerate` now marks `free_used=true` in the same transaction that
  holds the user row `FOR UPDATE` and assigns the deck's `billing_kind='free'`.
  Concurrent reservations therefore observe the free quota as already held.
- Failed free generation resets `free_used=false`; successful free generation
  leaves the optimistic reservation unchanged.
- Failed credit generation atomically changes the deck from `credit` to
  `refunded` with `UPDATE ... WHERE billing_kind='credit' RETURNING user_id`.
  A credit is returned only when that transition succeeds, making repeated
  finalization a no-op.
- Generation jobs use one BullMQ attempt so a refunded deck is not retried
  without a new charge.
- The pure finalization decision helper covers free release, credit refund,
  ready outcomes, and already-refunded retries. Database integration remains
  deferred to the Task 4 real-pool HTTP suite because `DATABASE_URL` is absent.

### Verification

- Focused: `src/billing.test.ts` — `18 passed`.
- Full API: `53 passed, 1 skipped`; `309 passed, 5 skipped`.
- IDE diagnostics: no errors in the changed TypeScript files.

## Critical idempotent free-release follow-up

- Failed free finalization now atomically transitions the deck from `free` to
  `released` with a guarded `UPDATE ... RETURNING user_id`.
- `free_used` is cleared only when that transition returns a row. Replaying the
  old failed finalization after a newer deck reserves free is therefore a no-op.
- Ready free finalization leaves `billing_kind='free'` and `free_used=true`.
- Added a focused transaction-style test covering both the failed replay after
  a newer reservation and the ready transition.

### Verification

- `pnpm exec vitest run src/billing.test.ts src/billing-finalize.test.ts`:
  `2 passed`; `21 passed`.
- `pnpm exec tsc -p tsconfig.json --noEmit`: passed.
- `pnpm test`: `54 passed, 1 skipped`; `312 passed, 5 skipped`.
