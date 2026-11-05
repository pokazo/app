import { joinRawSlideBlocks, splitRawSlideBlocks } from "./slide-structure.js";

export const POKAZO_CREDIT_ATTR = "data-pk-credit";
export const POKAZO_CREDIT_TEXT = "Создано с помощью pokazo.ru";
export const POKAZO_CREDIT_URL = "https://pokazo.ru";

/** Free deck watermark only until the user has any paid payment. */
export function pokazoCreditEnabled(opts: {
  billingKind: string | null | undefined;
  userHasPaid: boolean;
}): boolean {
  return opts.billingKind === "free" && !opts.userHasPaid;
}

export function slidesHavePokazoCredit(md: string): boolean {
  return new RegExp(`${POKAZO_CREDIT_ATTR}(?:\\s|>)`).test(md);
}

const CREDIT_STYLE_RE =
  /<style\b[^>]*\bdata-pk-style="credit"[^>]*>[\s\S]*?<\/style>\s*/gi;
const CREDIT_BLOCK_RE = /<div\b[^>]*\bdata-pk-credit(?:\s|>)[^>]*>[\s\S]*?<\/div>\s*/gi;

const CREDIT_STYLE = `<style data-pk-style="credit">
.pk-credit {
  position: absolute;
  right: clamp(0.75rem, 2vw, 1.25rem);
  bottom: clamp(0.5rem, 1.5vw, 0.9rem);
  z-index: 20;
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.25;
  letter-spacing: 0.03em;
  color: var(--pk-faint, rgba(100, 100, 100, 0.9));
  pointer-events: auto;
}
.pk-credit a {
  color: inherit;
  text-decoration: none;
}
.pk-credit__brand {
  color: var(--pk-accent, #c45c26);
}
</style>
`;

const CREDIT_HTML = `<div class="pk-credit" ${POKAZO_CREDIT_ATTR}>
  <a href="${POKAZO_CREDIT_URL}" target="_blank" rel="noopener noreferrer">Создано с помощью <span class="pk-credit__brand">pokazo.ru</span></a>
</div>
`;

export function stripPokazoCredit(md: string): string {
  return md.replace(CREDIT_BLOCK_RE, "").replace(CREDIT_STYLE_RE, "");
}

function appendCreditToBlock(block: string): string {
  const trimmed = block.replace(/\s+$/, "");
  if (new RegExp(`${POKAZO_CREDIT_ATTR}(?:\\s|>)`).test(trimmed)) return `${trimmed}\n`;
  return `${trimmed}\n\n${CREDIT_HTML}`;
}

/** Deck-level frontmatter (theme/title) without layout or heading — not a visible slide. */
export function isDeckHeadmatterOnly(block: string): boolean {
  return !/^layout:\s*\S+/m.test(block) && !/^#\s/m.test(block);
}

/** Idempotent: first + last content slides get a theme-tinted Pokazo credit (free watermark). */
export function applyPokazoCredit(md: string, enabled: boolean): string {
  const cleaned = stripPokazoCredit(md);
  if (!enabled) return cleaned;

  const blocks = splitRawSlideBlocks(cleaned);
  if (blocks.length < 1) return cleaned;

  const contentIdx = blocks
    .map((block, i) => (isDeckHeadmatterOnly(block) ? -1 : i))
    .filter((i) => i >= 0);
  if (contentIdx.length < 1) return cleaned;

  const first = contentIdx[0]!;
  const last = contentIdx[contentIdx.length - 1]!;
  blocks[first] = appendCreditToBlock(blocks[first]!);
  if (last !== first) {
    blocks[last] = appendCreditToBlock(blocks[last]!);
  }

  let out = joinRawSlideBlocks(blocks);
  // Style once after the deck headmatter (first ---…---).
  const head = out.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (head && head.index === 0) {
    const end = head[0].length;
    out = `${out.slice(0, end)}\n\n${CREDIT_STYLE}${out.slice(end).replace(/^\s+/, "\n")}`;
  } else {
    out = `${CREDIT_STYLE}\n${out}`;
  }
  return out;
}
