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

  it("export rejects a non-uuid", async () => {
    const app = createApp();
    const res = await app.request("/api/decks/not-an-id/export/pdf");
    expect(res.status).toBe(404);
  });

  it("export rejects unknown format", async () => {
    const app = createApp();
    const res = await app.request("/api/decks/11111111-1111-1111-1111-111111111111/export/gif");
    expect(res.status).toBe(400);
  });

  it("speech rejects a non-uuid", async () => {
    const app = createApp();
    const res = await app.request("/api/decks/not-an-id/speech");
    expect(res.status).toBe(404);
  });

  it("speech-pdf rejects a non-uuid", async () => {
    const app = createApp();
    const res = await app.request("/api/decks/not-an-id/export/speech-pdf");
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

  it("keeps image-left layout and local image path", () => {
    const out = guardMarkdown(
      `---\nlayout: image-left\nimage: /hero.jpg\n---\n\n# Hi`,
      "seriph",
    );
    expect(out).toMatch(/layout: image-left/);
    expect(out).toMatch(/^image: \/hero\.jpg$/m);
  });

  it("strips remote image URLs from frontmatter", () => {
    const out = guardMarkdown(
      `---\nlayout: image-right\nimage: https://evil.example/x.jpg\n---\n\n# Hi`,
    );
    expect(out).not.toMatch(/https:\/\//);
    expect(out).not.toMatch(/^image:\s*https/m);
  });

  it("keeps carbon icon tags and strips unknown custom components", () => {
    const out = guardMarkdown(
      `---\nlayout: default\n---\n\n# Hi\n\n<carbon-logo-java />\n<EvilWidget foo="1" />\n`,
    );
    expect(out).toMatch(/<carbon-logo-java\s*\/>/);
    expect(out).not.toMatch(/EvilWidget/);
  });

  it("keeps timeline and stats layouts", () => {
    expect(guardMarkdown(`---\nlayout: timeline\n---\n\n# T`)).toMatch(/layout: timeline/);
    expect(guardMarkdown(`---\nlayout: stats\n---\n\n# S`)).toMatch(/layout: stats/);
    expect(guardMarkdown(`---\nlayout: skills\n---\n\n# K`)).toMatch(/layout: skills/);
    expect(guardMarkdown(`---\nlayout: hero\n---\n\n# H`)).toMatch(/layout: hero/);
    expect(guardMarkdown(`---\nlayout: two-cols\n---\n\n# T`)).toMatch(/layout: two-cols/);
    expect(guardMarkdown(`---\nlayout: quote\n---\n\n# Q`)).toMatch(/layout: quote/);
    expect(guardMarkdown(`---\nlayout: fact\n---\n\n# F`)).toMatch(/layout: fact/);
    expect(guardMarkdown(`---\nlayout: icon\n---\n\n# I`)).toMatch(/layout: icon/);
    expect(guardMarkdown(`---\nlayout: cards\n---\n\n# C`)).toMatch(/layout: cards/);
  });

  it("keeps timeline steps YAML", () => {
    const out = guardMarkdown(`---
layout: timeline
kicker: PATH
steps:
  - phase: "2012"
    title: Start
    body: first job
    state: done
---

# Path
`);
    expect(out).toMatch(/layout: timeline/);
    expect(out).toMatch(/kicker: PATH/);
    expect(out).toMatch(/state: done/);
  });
});

describe("next path", () => {
  it("rejects open redirects", () => {
    expect(isSafePath("https://evil.com")).toBe("/");
    expect(isSafePath("/app?topic=x")).toBe("/app?topic=x");
  });
});
