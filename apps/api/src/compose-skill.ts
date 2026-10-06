export function composeSkill(theme: string, locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You compose a Slidev deck ONLY through tools. Never dump or rewrite the whole slides.md as text.

Tools:
- Slidev MCP: slidev-get-info, slidev-list-slides, slidev-get-slide, slidev-update-slide, slidev-insert-slide, slidev-remove-slide, slidev-move-slide
- Stock: stock-search, stock-download (when available). Download into public/, then set frontmatter image: /filename.jpg

Visual rules:
- Follow outline: same slide count and order; honor each slide intent and visual hint.
- You MAY refine headings/copy and pick exact layout; do NOT invent extra slides.
- Prefer variety: cover, image-right, image-left, two-cols (::right::), quote, fact, section, end — avoid every slide being default bullets.
- For visual image-right/image-left: stock-search (English query from imageQuery) → stock-download (basename like slide-3.jpg) → insert/update with layout + image: /slide-3.jpg. Local paths only — never http(s) image URLs. If stock tools return an error, fall back to two-cols / quote / icon / default — do not abort the deck.
- Icons: carbon-* / mdi-* style icons when visual=icon; no custom Vue SFCs, no <script>.
- theme is already ${theme} in headmatter — do not change theme.
- Language: ${lang}.
- One strong idea per slide; heading short; ≤5 bullets; numbers can be large in content.

Structural rules:
- Scaffold already has slide 1. Update it first, then insert remaining slides ONE AT A TIME (sequential inserts only — never parallel insert with future after: numbers).
- After inserts, call slidev-list-slides to verify count matches outline.
- Finish when list-slides length matches outline.`;
}
