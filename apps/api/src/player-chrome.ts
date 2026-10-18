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
/* Clip stage so WAAPI slide/rise never paints outside the player. */
#slide-container,
#slideshow {
  overflow: hidden !important;
}
.slidev-page {
  will-change: transform, opacity;
}
`.trim();

/**
 * Slidev's own embed postMessage listener is __DEV__-only.
 * Mirror that protocol so the parent SPA can go(n) without reloading the iframe.
 *
 * Vue TransitionGroup + hmrSkipTransition is unreliable after the first slide,
 * so adjacent page changes use Web Animations API, then nav.go() with Vue
 * transitions disabled.
 */
export const PLAYER_NAV_SCRIPT = `
(function () {
  var DURATION = 650;
  var EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
  var busy = false;
  var pending = null;
  function debugOn() {
    try {
      if (localStorage.getItem("pkDebugAnim") === "1") return true;
    } catch (e) {}
    return /(?:^|[?&])pkDebugAnim=1(?:&|$)/.test(location.search);
  }
  function log() {
    if (!debugOn()) return;
    var args = ["[pk-anim]"].concat([].slice.call(arguments));
    try { console.log.apply(console, args); } catch (e) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ target: "pokazo", type: "anim-log", args: [].slice.call(arguments) }, "*");
      }
    } catch (e2) {}
  }

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
  function disableVueTransition(slidev) {
    if (!slidev) return;
    try { slidev.configs.transition = null; } catch (e) {}
    var slides = unwrap(slidev.nav && slidev.nav.slides);
    if (!slides) return;
    for (var i = 0; i < slides.length; i++) {
      var meta = slides[i] && slides[i].meta;
      if (meta) {
        try { meta.transition = null; } catch (e2) {}
      }
    }
  }
  function slideEl(no) {
    return document.querySelector('.slidev-page[data-slidev-no="' + no + '"]');
  }
  function clearAnimStyles(el) {
    if (!el) return;
    el.style.removeProperty("display");
    el.style.removeProperty("z-index");
    el.style.removeProperty("pointer-events");
  }
  function navGo(slidev, target, clickCount) {
    if (slidev && slidev.nav && typeof slidev.nav.go === "function") {
      slidev.nav.go(target, clickCount);
      return true;
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
  function keyframes(kind, dir, role) {
    if (kind === "rise") {
      if (role === "from") {
        return [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: "translate(0, " + (dir > 0 ? "-28%" : "28%") + ") scale(0.96)", opacity: 0 }
        ];
      }
      return [
        { transform: "translate(0, " + (dir > 0 ? "56%" : "-56%") + ") scale(0.94)", opacity: 0 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 }
      ];
    }
    if (role === "from") {
      return [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: "translate(" + (dir > 0 ? "-42%" : "42%") + ", 0) scale(0.96)", opacity: 0 }
      ];
    }
    return [
      { transform: "translate(" + (dir > 0 ? "72%" : "-72%") + ", 0) scale(0.94)", opacity: 0 },
      { transform: "translate(0, 0) scale(1)", opacity: 1 }
    ];
  }
  function runWaapi(fromEl, toEl, kind, dir) {
    var opts = { duration: DURATION, easing: EASING, fill: "forwards" };
    toEl.style.setProperty("display", "block", "important");
    toEl.style.setProperty("z-index", "2", "important");
    toEl.style.setProperty("pointer-events", "none", "important");
    fromEl.style.setProperty("z-index", "1", "important");
    var a1 = fromEl.animate(keyframes(kind, dir, "from"), opts);
    var a2 = toEl.animate(keyframes(kind, dir, "to"), opts);
    return Promise.all([a1.finished, a2.finished]).then(function () {
      return { a1: a1, a2: a2 };
    });
  }
  function finishAnims(anims, fromEl, toEl) {
    try { anims.a1.cancel(); } catch (e) {}
    try { anims.a2.cancel(); } catch (e2) {}
    clearAnimStyles(fromEl);
    clearAnimStyles(toEl);
  }
  function animateThenGo(slidev, target, clickCount) {
    var cur = pageNo(slidev);
    if (!cur || target === cur) {
      log("skip same-page", { cur: cur, target: target, clickCount: clickCount });
      return navGo(slidev, target, clickCount);
    }
    disableVueTransition(slidev);
    var delta = target - cur;
    var fromEl = slideEl(cur);
    var toEl = slideEl(target);
    // Only adjacent slides animate; jumps stay instant.
    if (clickCount || Math.abs(delta) !== 1 || !fromEl || !toEl || typeof fromEl.animate !== "function") {
      log("instant", {
        cur: cur,
        target: target,
        reason: clickCount ? "clicks" : Math.abs(delta) !== 1 ? "jump" : !fromEl ? "no-from" : !toEl ? "no-to" : "no-waapi"
      });
      return navGo(slidev, target, clickCount);
    }
    if (busy) {
      pending = { target: target, clickCount: clickCount };
      log("queued", pending);
      return true;
    }
    busy = true;
    var dir = delta > 0 ? 1 : -1;
    var kind = ((Math.max(1, target) - 1) % 2 === 0) ? "slide" : "rise";
    log("start", { cur: cur, target: target, kind: kind, dir: dir, ms: DURATION });
    var t0 = performance.now();
    runWaapi(fromEl, toEl, kind, dir).then(function (anims) {
      log("done", { cur: cur, target: target, kind: kind, ms: Math.round(performance.now() - t0) });
      navGo(slidev, target, clickCount);
      requestAnimationFrame(function () {
        finishAnims(anims, fromEl, toEl);
        busy = false;
        if (pending) {
          var next = pending;
          pending = null;
          if (pageNo(ctx()) !== next.target) go(next.target, next.clickCount);
        }
      });
    }).catch(function (err) {
      log("error", { cur: cur, target: target, err: String(err && err.message || err) });
      clearAnimStyles(fromEl);
      clearAnimStyles(toEl);
      busy = false;
      navGo(slidev, target, clickCount);
    });
    return true;
  }
  function go(no, clicks) {
    var slidev = ctx();
    if (!slidev) return false;
    var target = +no;
    var clickCount = clicks == null ? 0 : +clicks;
    return animateThenGo(slidev, target, clickCount);
  }
  function apply(no, clicks) {
    if (go(no, clicks)) return;
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (go(no, clicks) || n > 80) clearInterval(t);
    }, 50);
  }
  function boot() {
    var slidev = ctx();
    if (!slidev) return false;
    disableVueTransition(slidev);
    log("boot", { page: pageNo(slidev), debug: true });
    return true;
  }
  if (!boot()) {
    var boots = 0;
    var bootT = setInterval(function () {
      boots += 1;
      if (boot() || boots > 80) clearInterval(bootT);
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
