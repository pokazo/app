/** Hide Slidev chrome that fights our /view filmstrip (goto TOC sticks out via -top-20). */
export const PLAYER_CHROME_HIDE_CSS = `
html, body, #app, #slide-container,
.slidev-page,
.slidev-slide-loading {
  background: #fff !important;
  color: #161616 !important;
}
.slidev-slide-loading {
  color: #5c5c5c !important;
}
#slidev-goto-dialog,
.fixed.top-4.right-4.z-modal,
#slide-container > nav {
  display: none !important;
}
/* Clip so slides visibly slide in/out of the stage. */
#slide-container,
#slideshow {
  overflow: hidden !important;
}
/* Strong custom Slidev transitions (injected; works on old decks). */
:root {
  --slidev-transition-duration: 0.7s !important;
  --pk-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
.pk-slide-enter-active,
.pk-slide-leave-active,
.pk-slide-back-enter-active,
.pk-slide-back-leave-active,
.pk-rise-enter-active,
.pk-rise-leave-active,
.pk-rise-back-enter-active,
.pk-rise-back-leave-active,
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active,
.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active,
.fade-enter-active,
.fade-leave-active {
  transition-duration: 0.7s !important;
  transition-timing-function: var(--pk-ease) !important;
}
.pk-slide-enter-active,
.pk-slide-leave-active,
.pk-slide-back-enter-active,
.pk-slide-back-leave-active,
.pk-rise-enter-active,
.pk-rise-leave-active,
.pk-rise-back-enter-active,
.pk-rise-back-leave-active,
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active,
.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  transition-property: translate, opacity, scale !important;
}
.fade-enter-active,
.fade-leave-active {
  transition-property: opacity, scale !important;
}
/* Horizontal push */
.pk-slide-enter-from {
  translate: 72% 0 !important;
  opacity: 0 !important;
  scale: 0.94 !important;
}
.pk-slide-leave-to {
  translate: -42% 0 !important;
  opacity: 0 !important;
  scale: 0.96 !important;
}
.pk-slide-back-enter-from {
  translate: -72% 0 !important;
  opacity: 0 !important;
  scale: 0.94 !important;
}
.pk-slide-back-leave-to {
  translate: 42% 0 !important;
  opacity: 0 !important;
  scale: 0.96 !important;
}
/* Vertical rise (alternate pages) */
.pk-rise-enter-from {
  translate: 0 56% !important;
  opacity: 0 !important;
  scale: 0.94 !important;
}
.pk-rise-leave-to {
  translate: 0 -28% !important;
  opacity: 0 !important;
  scale: 0.96 !important;
}
.pk-rise-back-enter-from {
  translate: 0 -56% !important;
  opacity: 0 !important;
  scale: 0.94 !important;
}
.pk-rise-back-leave-to {
  translate: 0 28% !important;
  opacity: 0 !important;
  scale: 0.96 !important;
}
.pk-slide-leave-active,
.pk-slide-back-leave-active,
.pk-rise-leave-active,
.pk-rise-back-leave-active,
.slide-left-leave-active,
.slide-right-leave-active,
.slide-up-leave-active,
.slide-down-leave-active,
.fade-leave-active {
  z-index: 1 !important;
}
.pk-slide-enter-active,
.pk-slide-back-enter-active,
.pk-rise-enter-active,
.pk-rise-back-enter-active,
.slide-left-enter-active,
.slide-right-enter-active,
.slide-up-enter-active,
.slide-down-enter-active,
.fade-enter-active {
  z-index: 2 !important;
}
@media (prefers-reduced-motion: reduce) {
  .pk-slide-enter-active,
  .pk-slide-leave-active,
  .pk-slide-back-enter-active,
  .pk-slide-back-leave-active,
  .pk-rise-enter-active,
  .pk-rise-leave-active,
  .pk-rise-back-enter-active,
  .pk-rise-back-leave-active,
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active,
  .slide-up-enter-active,
  .slide-up-leave-active,
  .slide-down-enter-active,
  .slide-down-leave-active,
  .fade-enter-active,
  .fade-leave-active {
    transition-duration: 0.45s !important;
  }
}
`.trim();

/**
 * Slidev's own embed postMessage listener is __DEV__-only.
 * Mirror that protocol so the parent SPA can go(n) without reloading the iframe.
 * Pins dramatic custom transitions at runtime (incl. already-built decks).
 */
export const PLAYER_NAV_SCRIPT = `
(function () {
  var TRANSITIONS = [
    "pk-slide | pk-slide-back",
    "pk-rise | pk-rise-back"
  ];
  function ctx() {
    var el = document.getElementById("app");
    var app = el && el.__vue_app__;
    return app && app._context && app._context.provides
      ? app._context.provides["$$slidev-context"]
      : null;
  }
  function pageNo(slidev) {
    var n = slidev && slidev.nav && slidev.nav.currentSlideNo;
    if (n && typeof n === "object" && "value" in n) n = n.value;
    return +n || 0;
  }
  function unwrap(ref) {
    if (ref && typeof ref === "object" && "value" in ref) return ref.value;
    return ref;
  }
  function pinTransition(slidev, targetPage) {
    if (!slidev || !slidev.configs) return;
    var page = targetPage || pageNo(slidev) || 1;
    var name = TRANSITIONS[(Math.max(1, page) - 1) % TRANSITIONS.length];
    try {
      slidev.configs.transition = name;
    } catch (e) {}
    var slides = unwrap(slidev.nav && slidev.nav.slides);
    if (slides && slides.length) {
      for (var i = 0; i < slides.length; i++) {
        var meta = slides[i] && slides[i].meta;
        if (meta) {
          try { meta.transition = name; } catch (e2) {}
        }
      }
    }
  }
  function go(no, clicks) {
    var slidev = ctx();
    var target = +no;
    var clickCount = clicks == null ? 0 : +clicks;
    pinTransition(slidev, target);
    if (slidev && slidev.nav) {
      var cur = pageNo(slidev);
      if (clickCount === 0 && cur > 0 && target === cur + 1 && typeof slidev.nav.nextSlide === "function") {
        slidev.nav.nextSlide();
        return true;
      }
      if (clickCount === 0 && cur > 1 && target === cur - 1 && typeof slidev.nav.prevSlide === "function") {
        slidev.nav.prevSlide();
        return true;
      }
      if (typeof slidev.nav.go === "function") {
        slidev.nav.go(target, clickCount);
        return true;
      }
    }
    var el = document.getElementById("app");
    var router = el && el.__vue_app__ && el.__vue_app__.config.globalProperties.$router;
    if (router) {
      var q = Object.assign({}, router.currentRoute.value.query, { embedded: "true" });
      if (clickCount) q.clicks = String(clickCount);
      router.push({ path: "/" + target, query: q });
      return true;
    }
    return false;
  }
  function apply(no, clicks) {
    if (go(no, clicks)) return;
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (go(no, clicks) || n > 80) clearInterval(t);
    }, 50);
  }
  function bootPin() {
    var slidev = ctx();
    if (slidev) {
      pinTransition(slidev, pageNo(slidev) || 1);
      return true;
    }
    return false;
  }
  if (!bootPin()) {
    var boots = 0;
    var bootT = setInterval(function () {
      boots += 1;
      if (bootPin() || boots > 80) clearInterval(bootT);
    }, 50);
  }
  window.addEventListener("message", function (ev) {
    var data = ev.data;
    if (!data || data.target !== "slidev" || data.type !== "navigate") return;
    apply(data.no, data.clicks);
  });
})();
`.trim();

export function deckAssetContentType(ext: string): string {
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return types[ext] ?? "application/octet-stream";
}

const LONG_CACHE = new Set([
  ".js",
  ".css",
  ".woff",
  ".woff2",
  ".svg",
]);

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

/** Content-hashed slide photo: slide-4-<hash>.jpg or .thumb.webp (see image-cache-bust.ts). */
const VERSIONED_IMAGE = /-[a-f0-9]{8,12}(?:\.(?:jpe?g|png|webp|gif)|\.thumb\.webp)$/i;

/**
 * HTML shell must revalidate.
 * Vite-hashed JS/CSS and content-hashed slide photos may be immutable.
 * Plain `/slide-N.jpg` is rewritten in place on rewrite — must NOT be immutable
 * or the player keeps showing the old picture after «сделай другую картинку».
 */
export function deckAssetCacheControl(ext: string, relPath = ""): string {
  const base = relPath.replace(/^.*\//, "");
  if (IMAGE_EXTS.has(ext)) {
    if (VERSIONED_IMAGE.test(base)) return "public, max-age=86400, immutable";
    return "no-cache";
  }
  if (LONG_CACHE.has(ext)) return "public, max-age=86400, immutable";
  return "no-cache";
}

export function injectPlayerChromeHide(html: string): string {
  let out = html;
  // Always refresh injected chrome so CSS/nav upgrades apply without rebuilding decks.
  out = out.replace(/<style id="pk-hide-slidev-chrome">[\s\S]*?<\/style>/i, "");
  out = out.replace(/<script id="pk-slidev-nav">[\s\S]*?<\/script>/i, "");
  const styleTag = `<style id="pk-hide-slidev-chrome">${PLAYER_CHROME_HIDE_CSS}</style>`;
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${styleTag}</head>`) : `${styleTag}${out}`;
  const scriptTag = `<script id="pk-slidev-nav">${PLAYER_NAV_SCRIPT}</script>`;
  out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${scriptTag}</body>`) : `${out}${scriptTag}`;
  return out;
}
