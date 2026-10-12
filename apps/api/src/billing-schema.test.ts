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
