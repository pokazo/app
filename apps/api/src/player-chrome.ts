/** Hide Slidev chrome that fights our /view filmstrip (goto TOC sticks out via -top-20). */
export const PLAYER_CHROME_HIDE_CSS = `
#slidev-goto-dialog,
.fixed.top-4.right-4.z-modal,
#slide-container > nav {
  display: none !important;
}
`.trim();

export function injectPlayerChromeHide(html: string): string {
  if (html.includes("id=\"pk-hide-slidev-chrome\"")) return html;
  const tag = `<style id="pk-hide-slidev-chrome">${PLAYER_CHROME_HIDE_CSS}</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${tag}</head>`);
  return `${tag}${html}`;
}
