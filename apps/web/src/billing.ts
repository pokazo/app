export type BillingProduct = "credit_1" | "month_30";

export type BillingState = {
  credits: number;
  freeAvailable: boolean;
  plan: "free" | "month";
  planUntil: string | null;
};

export type BillingMe = BillingState & {
  paymentsEnabled: boolean;
  label: string;
  prices: {
    creditRub: number;
    monthRub: number;
  };
};

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
