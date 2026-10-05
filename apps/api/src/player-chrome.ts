/** Hide Slidev chrome that fights our /view filmstrip (goto TOC sticks out via -top-20). */
export const PLAYER_CHROME_HIDE_CSS = `
#slidev-goto-dialog,
.fixed.top-4.right-4.z-modal,
#slide-container > nav {
  display: none !important;
}
`.trim();

/**
 * Slidev's own embed postMessage listener is __DEV__-only.
 * Mirror that protocol so the parent SPA can go(n) without reloading the iframe.
 */
export const PLAYER_NAV_SCRIPT = `
(function () {
  function ctx() {
    var el = document.getElementById("app");
    var app = el && el.__vue_app__;
    return app && app._context && app._context.provides
      ? app._context.provides["$$slidev-context"]
      : null;
  }
  function go(no, clicks) {
    var slidev = ctx();
    if (slidev && slidev.nav && typeof slidev.nav.go === "function") {
      slidev.nav.go(+no, clicks == null ? 0 : +clicks);
      return true;
    }
    var el = document.getElementById("app");
    var router = el && el.__vue_app__ && el.__vue_app__.config.globalProperties.$router;
    if (router) {
      var q = Object.assign({}, router.currentRoute.value.query, { embedded: "true" });
      if (clicks) q.clicks = String(clicks);
      router.push({ path: "/" + no, query: q });
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
  window.addEventListener("message", function (ev) {
    var data = ev.data;
    if (!data || data.target !== "slidev" || data.type !== "navigate") return;
    apply(data.no, data.clicks);
  });
})();
`.trim();

export function injectPlayerChromeHide(html: string): string {
  let out = html;
  if (!out.includes('id="pk-hide-slidev-chrome"')) {
    const tag = `<style id="pk-hide-slidev-chrome">${PLAYER_CHROME_HIDE_CSS}</style>`;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${tag}</head>`) : `${tag}${out}`;
  }
  if (!out.includes('id="pk-slidev-nav"')) {
    const tag = `<script id="pk-slidev-nav">${PLAYER_NAV_SCRIPT}</script>`;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${tag}</body>`) : `${out}${tag}`;
  }
  return out;
}
