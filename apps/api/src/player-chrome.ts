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
/* Clip stage; content-reveal never paints outside the player. */
#slide-container,
#slideshow {
  overflow: hidden !important;
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
 * Adjacent page changes: cover with the new slide background immediately, then
 * reveal text/content with WAAPI. Never animate the outgoing page (that caused
 * old-slide flashes after commitStyles/clear). Then nav.go() with Vue transitions off.
 */
export const PLAYER_NAV_SCRIPT = `
(function () {
  try {
    if (window.__pkAnimBound) return;
    window.__pkAnimBound = true;
    window.__pkAnimReady = true;
  } catch (e0) { return; }
  try { console.info("[pk-anim] loaded"); } catch (e1) {}
  var DURATION = 520;
  var STAGGER = 55;
  var EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
  var BG_SKIP = /(?:^|\\s)(?:pk-brick__grid|pk-brick__frame|pk-hero__photo|pk-split__photo|pk-agenda__waves)(?:\\s|$)/;
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
  // Full-size /slide-N.jpg only for the visible slide and its neighbors.
  // Slidev mounts every page; without this gate a refresh fetches every photo.
  var imgSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  function isSlidePhotoUrl(url) {
    return /\\/slide-\\d+/i.test(String(url || ""));
  }
  function slideNoOf(img) {
    var page = img.closest ? img.closest(".slidev-page") : null;
    if (!page) return 0;
    return +(page.getAttribute("data-slidev-no") || 0);
  }
  function currentPage() {
    var n = pageNo(ctx());
    if (n) return n;
    var m = (location.pathname || "").match(/\\/(\\d+)\\/?$/);
    return m ? +m[1] : 1;
  }
  function slidePhotoNear(slideNo, current) {
    if (!(slideNo >= 1)) return false;
    var cur = current >= 1 ? current : 1;
    return Math.abs(slideNo - cur) <= 1;
  }
  function pkApplySlidePhotos(forcePage) {
    if (!imgSrcDesc || typeof imgSrcDesc.set !== "function") return;
    var cur = forcePage || currentPage();
    var nodes = document.querySelectorAll("img[data-pk-src]");
    for (var i = 0; i < nodes.length; i++) {
      var img = nodes[i];
      var url = img.getAttribute("data-pk-src") || "";
      if (!url || !slidePhotoNear(slideNoOf(img), cur)) continue;
      var now = imgSrcDesc.get ? imgSrcDesc.get.call(img) : "";
      if (now === url) continue;
      try {
        if (now && new URL(url, location.href).href === now) continue;
      } catch (eSame) {}
      imgSrcDesc.set.call(img, url);
    }
  }
  var photoQueued = false;
  function scheduleSlidePhotos() {
    if (photoQueued) return;
    photoQueued = true;
    requestAnimationFrame(function () {
      photoQueued = false;
      pkApplySlidePhotos();
    });
  }
  if (imgSrcDesc && typeof imgSrcDesc.set === "function") {
    try {
      Object.defineProperty(HTMLImageElement.prototype, "src", {
        configurable: true,
        enumerable: true,
        get: function () {
          return imgSrcDesc.get ? imgSrcDesc.get.call(this) : "";
        },
        set: function (v) {
          var url = String(v || "");
          if (!isSlidePhotoUrl(url)) {
            imgSrcDesc.set.call(this, v);
            return;
          }
          this.setAttribute("data-pk-src", url);
          if (slidePhotoNear(slideNoOf(this), currentPage())) imgSrcDesc.set.call(this, url);
        }
      });
    } catch (ePhoto) {}
  }
  if (window.MutationObserver && document.documentElement) {
    new MutationObserver(function () { scheduleSlidePhotos(); }).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  function disableVueTransition(slidev) {
    if (!slidev) return;
    try { slidev.configs.transition = false; } catch (e) {}
    try {
      var ct = slidev.nav && slidev.nav.currentTransition;
      if (ct && typeof ct === "object" && "value" in ct) ct.value = false;
      else if (slidev.nav) slidev.nav.currentTransition = false;
    } catch (e2) {}
  }
  function slideEl(no) {
    return document.querySelector('.slidev-page[data-slidev-no="' + no + '"]');
  }
  function classNameOf(el) {
    if (!el) return "";
    var c = el.className;
    if (typeof c === "string") return c;
    if (c && typeof c.baseVal === "string") return c.baseVal;
    return "";
  }
  function clearPageStyles(el) {
    if (!el) return;
    el.style.removeProperty("display");
    el.style.removeProperty("z-index");
    el.style.removeProperty("pointer-events");
    el.style.removeProperty("transform");
    el.style.removeProperty("opacity");
  }
  function clearContentStyles(el) {
    if (!el) return;
    el.style.removeProperty("opacity");
    el.style.removeProperty("transform");
    el.style.removeProperty("will-change");
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
  /** Content layers to reveal; decorative bg (grid/frame/photo) stays visible immediately. */
  function contentNodes(slideRoot) {
    var brick = slideRoot.querySelector(".pk-brick, .pk-split");
    var root = brick || slideRoot;
    var nodes = [];
    var kids = root.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (BG_SKIP.test(classNameOf(el))) continue;
      nodes.push(el);
    }
    if (nodes.length) return nodes;
    var fb = slideRoot.querySelectorAll(
      ".pk-brick__inner, .pk-brick__pane, .pk-split__pane, .pk-hero__plate, .pk-title"
    );
    for (var j = 0; j < fb.length; j++) nodes.push(fb[j]);
    return nodes;
  }
  function runContentReveal(fromEl, toEl) {
    var contents = contentNodes(toEl);
    stopElementAnims(fromEl);
    stopElementAnims(toEl);
    for (var s = 0; s < contents.length; s++) stopElementAnims(contents[s]);

    // New slide covers old immediately — bg + photo visible, text hidden.
    toEl.style.setProperty("display", "block", "important");
    toEl.style.setProperty("pointer-events", "none", "important");
    toEl.style.setProperty("z-index", "2", "important");
    toEl.style.setProperty("opacity", "1", "important");
    toEl.style.setProperty("transform", "none", "important");
    fromEl.style.setProperty("z-index", "1", "important");

    for (var h = 0; h < contents.length; h++) {
      contents[h].style.setProperty("opacity", "0", "important");
      contents[h].style.setProperty("transform", "translateY(20px)", "important");
      contents[h].style.setProperty("will-change", "opacity, transform");
    }

    var opts = { duration: DURATION, easing: EASING, fill: "forwards" };
    var anims = [];
    var waits = [];
    for (var c = 0; c < contents.length; c++) {
      var el = contents[c];
      var a = el.animate(
        [
          { opacity: 0, transform: "translateY(20px)" },
          { opacity: 1, transform: "translateY(0)" }
        ],
        Object.assign({}, opts, { delay: Math.min(c * STAGGER, 220) })
      );
      anims.push(a);
      waits.push(a.finished);
    }
    if (!waits.length) {
      return Promise.resolve({ anims: anims, contents: contents });
    }
    return Promise.all(waits).then(function () {
      return { anims: anims, contents: contents };
    });
  }
  function finishReveal(bundle, fromEl, toEl) {
    var anims = (bundle && bundle.anims) || [];
    var contents = (bundle && bundle.contents) || [];
    for (var i = 0; i < anims.length; i++) {
      try { anims[i].commitStyles(); } catch (c1) {}
      try { anims[i].cancel(); } catch (c2) {}
    }
    for (var j = 0; j < contents.length; j++) clearContentStyles(contents[j]);
    clearPageStyles(fromEl);
    clearPageStyles(toEl);
  }
  function afterPaint(fn) {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn);
    });
  }
  function drainPending(justFinishedTarget) {
    busy = false;
    inflightTarget = 0;
    if (!pending) return;
    var next = pending;
    pending = null;
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
    pkApplySlidePhotos(target);
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
    if (target === lastAppliedTarget && performance.now() - lastAppliedAt < DURATION + 280) {
      log("ignore-dup-recent", { target: target });
      return true;
    }
    disableVueTransition(slidev);
    var delta = target - cur;
    var fromEl = slideEl(cur);
    var toEl = slideEl(target);
    // Only adjacent slides animate; jumps stay instant.
    if (clickCount || Math.abs(delta) !== 1 || !fromEl || !toEl || typeof toEl.animate !== "function") {
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
    log("start", { cur: cur, target: target, kind: "content-reveal", ms: DURATION });
    var t0 = performance.now();
    runContentReveal(fromEl, toEl).then(function (bundle) {
      log("done", {
        cur: cur,
        target: target,
        nodes: (bundle.contents || []).length,
        ms: Math.round(performance.now() - t0)
      });
      navGo(slidev, target, clickCount);
      // Wait for Vue to adopt the new page before stripping overlay styles.
      afterPaint(function () {
        finishReveal(bundle, fromEl, toEl);
        drainPending(target);
      });
    }).catch(function (err) {
      log("error", { cur: cur, target: target, err: String(err && err.message || err) });
      try {
        var contents = contentNodes(toEl);
        for (var i = 0; i < contents.length; i++) clearContentStyles(contents[i]);
      } catch (e3) {}
      clearPageStyles(fromEl);
      clearPageStyles(toEl);
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
    pkApplySlidePhotos(pageNo(slidev));
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
/** Current slide plus one neighbor on each side. Slide 0 means the img is not in a page yet. */
export function slidePhotoShouldLoad(slideNo: number, current: number): boolean {
  if (!Number.isFinite(slideNo) || slideNo < 1) return false;
  const cur = Number.isFinite(current) && current >= 1 ? current : 1;
  return Math.abs(slideNo - cur) <= 1;
}

export function deckAssetValidators(
  size: number,
  mtimeMs: number,
): { etag: string; lastModified: string } {
  const etag = `W/"${Math.max(0, Math.round(size))}-${Math.round(mtimeMs)}"`;
  return { etag, lastModified: new Date(mtimeMs).toUTCString() };
}

/** True when the browser already has this exact file (`no-cache` revalidation). */
export function deckAssetNotModified(
  ifNoneMatch: string | undefined,
  ifModifiedSince: string | undefined,
  validators: { etag: string; lastModified: string },
): boolean {
  const inm = ifNoneMatch?.trim();
  if (inm) {
    if (inm === "*") return true;
    return inm.split(",").some((part) => part.trim() === validators.etag);
  }
  if (!ifModifiedSince) return false;
  const since = Date.parse(ifModifiedSince);
  const modified = Date.parse(validators.lastModified);
  return Number.isFinite(since) && Number.isFinite(modified) && modified <= since;
}

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
