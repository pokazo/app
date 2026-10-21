import type { BillingProduct, BillingState } from "./billing";
import { reachPkGoal } from "./metrika";

export function checkoutGoalForProduct(product: BillingProduct): string {
  return product === "credit_1" ? "payment-checkout-credit" : "payment-checkout-month";
}

export function inferPaymentSuccessGoal(before: BillingState, after: BillingState): string | null {
  const monthUpdated =
    after.plan === "month" &&
    (before.plan !== "month" ||
      (after.planUntil !== null && after.planUntil !== before.planUntil));
  if (monthUpdated) return "payment-paid-month";
  if (after.credits > before.credits) return "payment-paid-credit";
  return null;
}

export function trackCheckoutStart(product: BillingProduct): void {
  reachPkGoal(checkoutGoalForProduct(product));
}

export function trackPaymentSuccess(before: BillingState, after: BillingState): void {
  const goal = inferPaymentSuccessGoal(before, after);
  if (goal) reachPkGoal(goal);
}
