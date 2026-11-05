import { describe, expect, it } from "vitest";
import {
  POKAZO_CREDIT_ATTR,
  POKAZO_CREDIT_URL,
  applyPokazoCredit,
  stripPokazoCredit,
} from "./pokazo-credit.js";

const TWO = `---
theme: default
---

---
layout: hero
variant: ribbon
palette: ocean
---

# Hero

Lead.

---
layout: statement
---

# Middle

---
layout: fact
---

# Last
`;

describe("applyPokazoCredit", () => {
  it("adds credit on first and last slides when enabled", () => {
    const out = applyPokazoCredit(TWO, true);
    expect(out).toContain(POKAZO_CREDIT_ATTR);
    expect(out).toContain("Создано с помощью");
    expect(out).toContain(POKAZO_CREDIT_URL);
    expect(out).toContain('data-pk-style="credit"');
    expect(out).toContain("--pk-faint");
    expect(out).toContain("--pk-accent");
    const hits = out.match(new RegExp(`${POKAZO_CREDIT_ATTR}(?:\\s|>)`, "g")) ?? [];
    expect(hits).toHaveLength(2);
    expect(out.indexOf("Hero")).toBeLessThan(out.indexOf(POKAZO_CREDIT_ATTR));
    expect(out.lastIndexOf(POKAZO_CREDIT_ATTR)).toBeGreaterThan(out.indexOf("# Last"));
  });

  it("is idempotent", () => {
    const once = applyPokazoCredit(TWO, true);
    const twice = applyPokazoCredit(once, true);
    expect(twice).toBe(once);
  });

  it("strips credit when disabled", () => {
    const withCredit = applyPokazoCredit(TWO, true);
    const out = applyPokazoCredit(withCredit, false);
    expect(out).not.toContain(POKAZO_CREDIT_ATTR);
    expect(out).not.toContain('data-pk-style="credit"');
    expect(stripPokazoCredit(withCredit)).toBe(out);
  });

  it("credits a single content slide once when only headmatter + one slide", () => {
    const one = `---
theme: default
---

---
layout: hero
variant: ribbon
---

# Only
`;
    const out = applyPokazoCredit(one, true);
    expect(out.match(new RegExp(`${POKAZO_CREDIT_ATTR}(?:\\s|>)`, "g"))).toHaveLength(1);
  });
});
