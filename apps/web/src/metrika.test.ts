import { describe, expect, it } from "vitest";
import { pkGoalId } from "./metrika";

describe("pkGoalId", () => {
  it("maps data-pk to Metrika JS goal ids", () => {
    expect(pkGoalId("cta-create")).toBe("cta_create");
    expect(pkGoalId("cta-pricing-nav")).toBe("cta_pricing_nav");
    expect(pkGoalId("pricing-view")).toBe("pricing_view");
  });
});
