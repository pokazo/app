import { describe, expect, it } from "vitest";
import {
  deckAssetCacheControl,
  deckAssetContentType,
  deckAssetNotModified,
  deckAssetValidators,
  injectPlayerChromeHide,
  PLAYER_NAV_SCRIPT,
  slidePhotoShouldLoad,
} from "./player-chrome.js";

describe("injectPlayerChromeHide", () => {
  it("injects style before </head>", () => {
    const out = injectPlayerChromeHide("<html><head><title>x</title></head><body></body></html>");
    expect(out).toContain('id="pk-hide-slidev-chrome"');
    expect(out).toContain("#slidev-goto-dialog");
    expect(out).toContain("html, body");
    expect(out).toMatch(/background:\s*#fff/);
    expect(out).toContain("slidev-slide-loading");
    expect(out).toContain("overflow: hidden");
    expect(out).toContain("-enter-active");
    expect(out).toContain("transition: none");
    expect(out).toMatch(/<\/style>\s*<\/head>/i);
  });

  it("refreshes prior inject so CSS upgrades apply", () => {
    const stale = `<html><head><style id="pk-hide-slidev-chrome">.old{}</style></head><body><script id="pk-slidev-nav">/*old*/</script></body></html>`;
    const out = injectPlayerChromeHide(stale);
    expect(out).toContain("runContentReveal");
    expect(out).not.toContain(".old{}");
    expect(out.match(/id="pk-hide-slidev-chrome"/g)).toHaveLength(1);
    expect(out.match(/id="pk-slidev-nav"/g)).toHaveLength(1);
  });

  it("injects postMessage nav before </body>", () => {
    const out = injectPlayerChromeHide("<html><head></head><body></body></html>");
    expect(out).toContain('id="pk-slidev-nav"');
    expect(out).toContain("data:text/javascript");
    expect(out).toContain("animateThenGo");
    expect(out).toContain("runContentReveal");
    expect(out).toContain("content-reveal");
    expect(out).toContain("contentNodes");
    expect(out).toContain("pk-brick__grid");
    expect(out).toContain("ignore-dup-inflight");
    expect(out).toContain("drop-pending-same");
    expect(out).toContain("currentTransition");
    expect(out).toContain("configs.transition%20%3D%20false");
    expect(out).toContain("pkDebugAnim");
    expect(out).toContain("%5Bpk-anim%5D");
    expect(out).not.toContain("Math.random");
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

describe("slidePhotoShouldLoad", () => {
  it("loads the current slide and its neighbors only", () => {
    expect(slidePhotoShouldLoad(1, 1)).toBe(true);
    expect(slidePhotoShouldLoad(2, 1)).toBe(true);
    expect(slidePhotoShouldLoad(3, 1)).toBe(false);
    expect(slidePhotoShouldLoad(4, 3)).toBe(true);
    expect(slidePhotoShouldLoad(0, 1)).toBe(false);
  });
});

describe("deck photo revalidation", () => {
  it("304s when the etag matches and misses when the file changed", () => {
    const v = deckAssetValidators(183128, Date.parse("2026-10-21T12:44:00.419Z"));
    expect(v.etag.startsWith('W/"')).toBe(true);
    expect(deckAssetNotModified(v.etag, undefined, v)).toBe(true);
    expect(deckAssetNotModified(`${v.etag}, W/"other"`, undefined, v)).toBe(true);
    expect(deckAssetNotModified('W/"0-0"', undefined, v)).toBe(false);
    expect(deckAssetNotModified(undefined, undefined, v)).toBe(false);
    expect(deckAssetNotModified(undefined, v.lastModified, v)).toBe(true);
  });
});

describe("slide photo gate", () => {
  it("holds full-size slide photos until the page is current or adjacent", () => {
    expect(PLAYER_NAV_SCRIPT).toContain("data-pk-src");
    expect(PLAYER_NAV_SCRIPT).toContain("isSlidePhotoUrl");
    expect(PLAYER_NAV_SCRIPT).toContain("pkApplySlidePhotos");
    expect(PLAYER_NAV_SCRIPT).toContain("Math.abs(slideNo - cur) <= 1");
  });
});
