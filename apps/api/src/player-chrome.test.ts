import { describe, expect, it } from "vitest";
import { deckAssetCacheControl, deckAssetContentType, injectPlayerChromeHide } from "./player-chrome.js";

describe("injectPlayerChromeHide", () => {
  it("injects style before </head>", () => {
    const out = injectPlayerChromeHide("<html><head><title>x</title></head><body></body></html>");
    expect(out).toContain('id="pk-hide-slidev-chrome"');
    expect(out).toContain("#slidev-goto-dialog");
    expect(out).toContain("html, body");
    expect(out).toMatch(/background:\s*#fff/);
    expect(out).toContain("slidev-slide-loading");
    expect(out).toContain("overflow: hidden");
    expect(out).toMatch(/<\/style>\s*<\/head>/i);
  });

  it("refreshes prior inject so CSS upgrades apply", () => {
    const stale = `<html><head><style id="pk-hide-slidev-chrome">.old{}</style></head><body><script id="pk-slidev-nav">/*old*/</script></body></html>`;
    const out = injectPlayerChromeHide(stale);
    expect(out).toContain("fromEl.animate");
    expect(out).not.toContain(".old{}");
    expect(out.match(/id="pk-hide-slidev-chrome"/g)).toHaveLength(1);
    expect(out.match(/id="pk-slidev-nav"/g)).toHaveLength(1);
  });

  it("injects postMessage nav before </body>", () => {
    const out = injectPlayerChromeHide("<html><head></head><body></body></html>");
    expect(out).toContain('id="pk-slidev-nav"');
    expect(out).toContain("data:text/javascript");
    expect(out).toContain("animateThenGo");
    expect(out).toContain("fromEl.animate");
    expect(out).toContain("configs.transition%20%3D%20null");
    expect(out).toContain("pkDebugAnim");
    expect(out).toContain("%5Bpk-anim%5D");
    expect(out).toMatch(/<\/script>\s*<\/body>/i);
  });
});

describe("deckAssetContentType", () => {
  it("serves jpeg as image/jpeg not octet-stream", () => {
    expect(deckAssetContentType(".jpg")).toBe("image/jpeg");
    expect(deckAssetContentType(".png")).toBe("image/png");
  });
});

describe("deckAssetCacheControl", () => {
  it("does not immutably cache plain slide photos (rewritten in place)", () => {
    expect(deckAssetCacheControl(".jpg", "slide-4.jpg")).toBe("no-cache");
    expect(deckAssetCacheControl(".jpg")).toBe("no-cache");
  });

  it("immutably caches content-hashed slide photos and vite assets", () => {
    expect(deckAssetCacheControl(".jpg", "slide-4-abc123def0.jpg")).toBe(
      "public, max-age=86400, immutable",
    );
    expect(deckAssetCacheControl(".webp", "slide-4-abc123def0.thumb.webp")).toBe(
      "public, max-age=86400, immutable",
    );
    expect(deckAssetCacheControl(".webp", "slide-4.thumb.webp")).toBe("no-cache");
    expect(deckAssetCacheControl(".js", "assets/index-DGXFAP9u.js")).toBe(
      "public, max-age=86400, immutable",
    );
    expect(deckAssetCacheControl(".css")).toBe("public, max-age=86400, immutable");
  });

  it("keeps html shell uncached", () => {
    expect(deckAssetCacheControl(".html")).toBe("no-cache");
  });
});
