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
/*
 * Kill Slidev/Vue route transitions in the embed. meta.transition is a getter
 * (frontmatter) so nulling it does nothing — without this, nav.go() after WAAPI
 * always plays a second fade/slide-left and the change looks double.
 */
.slidev-page[class*="-enter-active"],
.slidev-page[class*="-leave-active"] {
  transition: none !important;
  animation: none !important;
}
.slidev-page[class*="-enter-from"],
.slidev-page[class*="-leave-to"],
.slidev-page[class*="-enter-to"],
.slidev-page[class*="-leave-from"] {
  opacity: 1 !important;
  transform: none !important;
  translate: none !important;
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
  try {
    if (window.__pkAnimBound) return;
    window.__pkAnimBound = true;
    window.__pkAnimReady = true;
  } catch (e0) { return; }
  try { console.info("[pk-anim] loaded"); } catch (e1) {}
  var DURATION = 650;
  var EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
  var busy = false;
  var inflightTarget = 0;
  var pending = null;
  var lastAppliedTarget = 0;
  var lastAppliedAt = 0;
  var applyWaitTimer = null;
  function debugOn() {
    try {
      if (localStorage.getItem("pkDebugAnim") === "1") return true;
    } catch (e) {}
    try {
      if (window.__pkAnimDebug) return true;
    } catch (e2) {}
    return /(?:^|[?&])pkDebugAnim=1(?:&|$)/.test(location.search || "");
  }
  function log() {
    if (!debugOn()) return;
    var payload = [].slice.call(arguments);
    // Prefer parent forward when embedded so DevTools on /view does not show each line twice.
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ target: "pokazo", type: "anim-log", args: payload }, "*");
        return;
      }
    } catch (e) {}
    try { console.log.apply(console, ["[pk-anim]"].concat(payload)); } catch (e2) {}
  }

  function ctx() {
    var el = document.getElementById("app");
    var app = el && el.__vue_app__;
    var prov = app && app._context && app._context.provides;
    if (!prov) return null;
    return prov["$$slidev-context"] || null;
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
    try { slidev.configs.transition = false; } catch (e) {}
    // meta.transition is often a read-only frontmatter getter — nulling is a no-op.
    // nav.currentTransition is what Vue Transition actually uses on go().
    try {
      var ct = slidev.nav && slidev.nav.currentTransition;
      if (ct && typeof ct === "object" && "value" in ct) ct.value = false;
      else if (slidev.nav) slidev.nav.currentTransition = false;
    } catch (e2) {}
  }
  function slideEl(no) {
    return document.querySelector('.slidev-page[data-slidev-no="' + no + '"]');
  }
  function clearAnimStyles(el) {
    if (!el) return;
    el.style.removeProperty("display");
    el.style.removeProperty("z-index");
    el.style.removeProperty("pointer-events");
    el.style.removeProperty("transform");
    el.style.removeProperty("opacity");
  }
  function stopElementAnims(el) {
    if (!el || typeof el.getAnimations !== "function") return;
    try {
      var list = el.getAnimations();
      for (var i = 0; i < list.length; i++) {
        try { list[i].cancel(); } catch (e) {}
      }
    } catch (e2) {}
  }
  function navGo(slidev, target, clickCount) {
    disableVueTransition(slidev);
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
  function runWaapi(fromEl, toEl, kind, dir, side) {
    var opts = { duration: DURATION, easing: EASING, fill: "forwards" };
    stopElementAnims(fromEl);
    stopElementAnims(toEl);
    toEl.style.setProperty("display", "block", "important");
    toEl.style.setProperty("pointer-events", "none", "important");
    var anims = { a1: null, a2: null, side: side };
    var waits = [];
    // Randomly animate only outgoing (from) or only incoming (to) — not both.
    if (side === "from") {
      fromEl.style.setProperty("z-index", "2", "important");
      toEl.style.setProperty("z-index", "1", "important");
      anims.a1 = fromEl.animate(keyframes(kind, dir, "from"), opts);
      waits.push(anims.a1.finished);
    } else {
      toEl.style.setProperty("z-index", "2", "important");
      fromEl.style.setProperty("z-index", "1", "important");
      anims.a2 = toEl.animate(keyframes(kind, dir, "to"), opts);
      waits.push(anims.a2.finished);
    }
    return Promise.all(waits).then(function () {
      return anims;
    });
  }
  function finishAnims(anims, fromEl, toEl) {
    try {
      if (anims.a1) {
        try { anims.a1.commitStyles(); } catch (c1) {}
        anims.a1.cancel();
      }
    } catch (e) {}
    try {
      if (anims.a2) {
        try { anims.a2.commitStyles(); } catch (c2) {}
        anims.a2.cancel();
      }
    } catch (e2) {}
    clearAnimStyles(fromEl);
    clearAnimStyles(toEl);
  }
  function drainPending(justFinishedTarget) {
    busy = false;
    inflightTarget = 0;
    if (!pending) return;
    var next = pending;
    pending = null;
    // pageNo often lags nav.go(); never re-animate the slide we just finished.
    if (next.target === justFinishedTarget) {
      log("drop-pending-same", next);
      return;
    }
    var slidev = ctx();
    if (slidev && pageNo(slidev) === next.target) {
      log("drop-pending-cur", next);
      return;
    }
    go(next.target, next.clickCount);
  }
  function animateThenGo(slidev, target, clickCount) {
    var cur = pageNo(slidev);
    if (!cur || target === cur) {
      log("skip same-page", { cur: cur, target: target, clickCount: clickCount });
      lastAppliedTarget = target;
      lastAppliedAt = performance.now();
      return navGo(slidev, target, clickCount);
    }
    if (busy) {
      if (target === inflightTarget) {
        log("ignore-dup-inflight", { target: target });
        return true;
      }
      pending = { target: target, clickCount: clickCount };
      log("queued", pending);
      return true;
    }
    // Parent often re-posts the same page while Vue/router catch up after WAAPI.
    if (target === lastAppliedTarget && performance.now() - lastAppliedAt < DURATION + 200) {
      log("ignore-dup-recent", { target: target });
      return true;
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
      lastAppliedTarget = target;
      lastAppliedAt = performance.now();
      return navGo(slidev, target, clickCount);
    }
    busy = true;
    inflightTarget = target;
    lastAppliedTarget = target;
    lastAppliedAt = performance.now();
    var dir = delta > 0 ? 1 : -1;
    var kind = ((Math.max(1, target) - 1) % 2 === 0) ? "slide" : "rise";
    var side = Math.random() < 0.5 ? "from" : "to";
    log("start", { cur: cur, target: target, kind: kind, dir: dir, side: side, ms: DURATION });
    var t0 = performance.now();
    runWaapi(fromEl, toEl, kind, dir, side).then(function (anims) {
      log("done", { cur: cur, target: target, kind: kind, side: side, ms: Math.round(performance.now() - t0) });
      navGo(slidev, target, clickCount);
      requestAnimationFrame(function () {
        finishAnims(anims, fromEl, toEl);
        drainPending(target);
      });
    }).catch(function (err) {
      log("error", { cur: cur, target: target, err: String(err && err.message || err) });
      clearAnimStyles(fromEl);
      clearAnimStyles(toEl);
      navGo(slidev, target, clickCount);
      drainPending(target);
    });
    return true;
  }
  function go(no, clicks) {
    var slidev = ctx();
    if (!slidev) {
      log("wait-ctx", { no: no, clicks: clicks });
      return false;
    }
    var target = +no;
    var clickCount = clicks == null ? 0 : +clicks;
    return animateThenGo(slidev, target, clickCount);
  }
  function apply(no, clicks) {
    log("navigate", { no: no, clicks: clicks });
    if (applyWaitTimer) {
      clearInterval(applyWaitTimer);
      applyWaitTimer = null;
    }
    if (go(no, clicks)) return;
    var n = 0;
    applyWaitTimer = setInterval(function () {
      n += 1;
      if (go(no, clicks) || n > 80) {
        clearInterval(applyWaitTimer);
        applyWaitTimer = null;
      }
    }, 50);
  }
  function boot() {
    var slidev = ctx();
    if (!slidev) return false;
    disableVueTransition(slidev);
    log("boot", { page: pageNo(slidev) });
    return true;
  }
  if (!boot()) {
    var boots = 0;
    var bootT = setInterval(function () {
      boots += 1;
      if (boot() || boots > 80) clearInterval(bootT);
    }, 50);
  }
  function onMessage(ev) {
    var data = ev && ev.data;
    if (!data || data.target !== "slidev" || data.type !== "navigate") return;
    apply(data.no, data.clicks);
  }
  window.addEventListener("message", onMessage);
  try { window.__pkAnimApply = apply; } catch (e3) {}
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
  out = out.replace(/<script\b[^>]*\bid="pk-slidev-nav"[^>]*>[\s\S]*?<\/script>/i, "");
  out = out.replace(/<script\b[^>]*\bid="pk-slidev-nav"[^>]*\/>/i, "");
  const styleTag = `<style id="pk-hide-slidev-chrome">${PLAYER_CHROME_HIDE_CSS}</style>`;
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${styleTag}</head>`) : `${styleTag}${out}`;
  // data: URL — executes reliably even when inline classic scripts are skipped in the embed iframe.
  const scriptSrc = `data:text/javascript;charset=utf-8,${encodeURIComponent(PLAYER_NAV_SCRIPT)}`;
  const scriptTag = `<script id="pk-slidev-nav" src="${scriptSrc}"></script>`;
  out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${scriptTag}</body>`) : `${out}${scriptTag}`;
  return out;
}
