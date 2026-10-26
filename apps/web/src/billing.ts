export type BillingProduct = "credit_1" | "month_30";

export type BillingCatalog = {
  paymentsEnabled: boolean;
  prices: {
    creditRub: number;
    monthRub: number;
  };
};

export const DEFAULT_BILLING_CATALOG: BillingCatalog = {
  paymentsEnabled: false,
  prices: { creditRub: 199, monthRub: 399 },
};

export type BillingState = {
  credits: number;
  freeAvailable: boolean;
  plan: "free" | "month";
  planUntil: string | null;
};

export type BillingMe = BillingState & BillingCatalog & {
  label: string;
};

/** PDF/PPTX of a free-slot deck stay locked until an active month. Paid decks still download. */
export function deckFileDownloadAllowed(opts: {
  plan: "free" | "month";
  billingKind: string | null | undefined;
}): boolean {
  if (opts.plan === "month") return true;
  return opts.billingKind !== "free";
}

export function formatBillingLabel(billing: BillingState): string {
  if (billing.plan === "month" && billing.planUntil) {
    const until = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(billing.planUntil));
    return `Безлимит до ${until}`;
  }
  if (billing.freeAvailable) return "Осталось: 1 бесплатная";
  return `Осталось: ${billing.credits} презентации`;
}
