import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { guardMarkdown, isSafePath } from "./md-guard.js";

describe("health", () => {
  it("returns ok", async () => {
    const app = createApp();
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("me without database is unavailable", async () => {
    const app = createApp();
    const res = await app.request("/api/auth/me");
    expect(res.status).toBe(503);
  });

  it("deck list without database is unavailable", async () => {
    const app = createApp();
    const res = await app.request("/api/decks");
    expect(res.status).toBe(503);
  });

  it("view meta rejects a non-uuid", async () => {
    const app = createApp();
    const res = await app.request("/api/view/not-an-id");
    expect(res.status).toBe(404);
  });
});

describe("md-guard", () => {
  it("strips script and unknown layout", () => {
    const md = `---\nlayout: hack\n---\n<script>alert(1)</script>\n# Hi`;
    const out = guardMarkdown(md);
    expect(out).not.toMatch(/script/i);
    expect(out).toMatch(/layout: default/);
  });

  it("quotes frontmatter title when it contains a colon", () => {
    const out = guardMarkdown(`---\ntheme: default\ntitle: Веб дизайн: Введение\n---\n\n# Hi`);
    expect(out).toMatch(/^title: "Веб дизайн: Введение"$/m);
  });
});

describe("next path", () => {
  it("rejects open redirects", () => {
    expect(isSafePath("https://evil.com")).toBe("/");
    expect(isSafePath("/app?topic=x")).toBe("/app?topic=x");
  });
});
