import { describe, expect, it } from "vitest";
import { deckAssetContentType, injectPlayerChromeHide } from "./player-chrome.js";

describe("injectPlayerChromeHide", () => {
  it("injects style before </head>", () => {
    const out = injectPlayerChromeHide("<html><head><title>x</title></head><body></body></html>");
    expect(out).toContain('id="pk-hide-slidev-chrome"');
    expect(out).toContain("#slidev-goto-dialog");
    expect(out).toContain("html, body");
    expect(out).toMatch(/background:\s*#fff/);
    expect(out).toContain("slidev-slide-loading");
    expect(out).toMatch(/<\/style>\s*<\/head>/i);
  });

  it("is idempotent", () => {
    const once = injectPlayerChromeHide("<html><head></head><body></body></html>");
    expect(injectPlayerChromeHide(once)).toBe(once);
  });

  it("injects postMessage nav before </body>", () => {
    const out = injectPlayerChromeHide("<html><head></head><body></body></html>");
    expect(out).toContain('id="pk-slidev-nav"');
    expect(out).toContain('target !== "slidev"');
    expect(out).toMatch(/<\/script>\s*<\/body>/i);
  });
});

describe("deckAssetContentType", () => {
  it("serves jpeg as image/jpeg not octet-stream", () => {
    expect(deckAssetContentType(".jpg")).toBe("image/jpeg");
    expect(deckAssetContentType(".png")).toBe("image/png");
  });
});
