import { describe, expect, it } from "vitest";
import { composeSkill } from "./compose-skill.js";

describe("composeSkill", () => {
  it("requires MCP + stock tools and sequential inserts", () => {
    const skill = composeSkill("seriph", "ru");
    expect(skill).toMatch(/stock-search/);
    expect(skill).toMatch(/stock-download/);
    expect(skill).toMatch(/slidev-insert-slide/);
    expect(skill).toMatch(/sequential/i);
    expect(skill).toMatch(/image-right/);
    expect(skill).toMatch(/Russian/);
    expect(skill).toMatch(/layout: timeline/);
    expect(skill).toMatch(/layout: stats/);
    expect(skill).toMatch(/layout: skills/);
    expect(skill).toMatch(/layout: hero/);
    expect(skill).toMatch(/Never dump|ONLY through (MCP|tools)/i);
  });
});
