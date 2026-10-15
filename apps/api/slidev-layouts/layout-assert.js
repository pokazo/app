/** Shared layout data contracts. Copied into each deck's layouts/ folder. */

import { icons as carbonIcons } from "@iconify-json/carbon";

export function layoutError(name, message) {
  return new Error(`LayoutError[${name}]: ${message}`);
}

export function isLocalImagePath(image) {
  if (!image || typeof image !== "string") return false;
  const t = image.trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return false;
  return t.startsWith("/") || !t.includes("://");
}

/** Prefer first non-empty array — `??` treats [] as present and hides aliases. */
export function preferList(...lists) {
  for (const list of lists) {
    if (Array.isArray(list) && list.length) return list;
  }
  return [];
}

/**
 * Curated Carbon names allowed for icon|features|process layouts.
 * LLM must pick from this set (via carbon-* or bare name) — no invented glyphs.
 */
export const CARBON_LAYOUT_ICON_NAMES = Object.freeze([
  "activity",
  "analytics",
  "application",
  "bicycle",
  "book",
  "building",
  "calendar",
  "camera",
  "car",
  "catalog",
  "certificate-check",
  "chart-bar",
  "chart-line",
  "chat",
  "checkmark",
  "cloud",
  "code",
  "collaborate",
  "connection",
  "currency",
  "delivery",
  "delivery-truck",
  "development",
  "document",
  "document-blank",
  "education",
  "email",
  "events",
  "favorite",
  "finance",
  "flash",
  "group",
  "growth",
  "home",
  "idea",
  "image",
  "industry",
  "information",
  "key",
  "list",
  "location",
  "locked",
  "map",
  "microphone",
  "money",
  "paint-brush",
  "partnership",
  "pedestrian",
  "phone",
  "policy",
  "purchase",
  "receipt",
  "rocket",
  "rule",
  "search",
  "security",
  "settings",
  "star",
  "store",
  "task",
  "thumbs-up",
  "time",
  "tools",
  "trophy",
  "user",
  "user-multiple",
  "video",
  "view",
  "wallet",
  "warning",
  "wifi",
  "workspace",
]);

const CARBON_LAYOUT_ICON_SET = new Set(CARBON_LAYOUT_ICON_NAMES);

/** `carbon-money`, `carbon-security`, … for prompts / layout-get */
export function layoutCarbonIconHints() {
  return CARBON_LAYOUT_ICON_NAMES.map((n) => `carbon-${n}`);
}

/**
 * Normalize iconHint to a Carbon icon name that exists in @iconify-json/carbon.
 * Accepts `carbon-money`, bare `money`, and mixed case. Rejects unknown / mdi-only.
 */
export function resolveCarbonIconName(hint) {
  if (!hint || typeof hint !== "string") return null;
  let name = hint.trim().replace(/^(carbon|mdi)-/i, "").toLowerCase();
  if (!name) return null;
  const icon = carbonIcons.icons?.[name];
  return icon?.body ? name : null;
}

/** True when hint resolves and is in the layout allowlist (LLM must use these). */
export function isLayoutCarbonIcon(hint) {
  const name = resolveCarbonIconName(hint);
  return name != null && CARBON_LAYOUT_ICON_SET.has(name);
}

export function renderCarbonSvg(hint, heightPx) {
  const name = resolveCarbonIconName(hint);
  if (!name || !CARBON_LAYOUT_ICON_SET.has(name)) return null;
  const icon = carbonIcons.icons[name];
  const w = icon.width ?? carbonIcons.width ?? 32;
  const h = icon.height ?? carbonIcons.height ?? 32;
  return {
    attributes: {
      width: heightPx,
      height: heightPx,
      viewBox: `0 0 ${w} ${h}`,
      xmlns: "http://www.w3.org/2000/svg",
      fill: "currentColor",
    },
    body: icon.body,
  };
}

export function assertStatsLayout(props) {
  const raw = preferList(props.items, props.stats);
  const ok = raw.filter((it) => it?.value?.trim() && it?.label?.trim());
  if (ok.length < 2) {
    throw layoutError("stats", "need ≥2 items with value and label");
  }
}

export function assertCardsLayout(props) {
  const raw = preferList(props.items, props.cards);
  const ok = raw.filter((it) => it?.title?.trim());
  if (ok.length < 2) {
    throw layoutError("cards", "need ≥2 items with title");
  }
}

export function assertSkillsLayout(props) {
  const ok = (props.items ?? []).filter((it) => it?.name?.trim());
  if (ok.length < 2) {
    throw layoutError("skills", "need ≥2 items with name");
  }
}

export function assertTimelineLayout(props) {
  const ok = (props.steps ?? []).filter((it) => it?.title?.trim());
  if (ok.length < 3) {
    throw layoutError("timeline", "need ≥3 steps with title");
  }
}

export function assertIconLayout(props) {
  if (!isLayoutCarbonIcon(props.iconHint)) {
    throw layoutError(
      "icon",
      "iconHint must be from the layout Carbon allowlist (see layout-get iconHints)",
    );
  }
}

export function assertImageLayout(name, props) {
  if (!isLocalImagePath(props.image)) {
    throw layoutError(name, "local image: path is required (not http)");
  }
}

const HERO_VARIANTS = new Set([
  "ribbon",
  "corner",
  "inset",
  "fullbleed",
  "product",
]);

export function assertHeroLayout(props) {
  const v = props.variant?.trim() || "";
  if (!HERO_VARIANTS.has(v)) {
    throw layoutError(
      "hero",
      `variant must be ribbon|corner|inset|fullbleed|product, got ${JSON.stringify(props.variant)}`,
    );
  }
  if (!isLocalImagePath(props.image)) {
    throw layoutError("hero", `${v} requires local image:`);
  }
}

export function assertQuoteLayout(opts) {
  if (!opts.hasBodySlot) {
    throw layoutError("quote", "body/slot content is required");
  }
}

export function assertFactLayout(opts) {
  if (!opts.hasBodySlot) {
    throw layoutError("fact", "body/slot content is required");
  }
}

export function assertTwoColsLayout(opts) {
  if (!opts.hasLeftSlot || !opts.hasRightSlot) {
    throw layoutError("two-cols", "both ::left:: and ::right:: slots are required");
  }
}

export function assertStatementLayout(opts) {
  if (!opts.hasBodySlot) {
    throw layoutError("statement", "body/slot content is required");
  }
}

export function assertFeaturesLayout(props) {
  const raw = preferList(props.items, props.features);
  const ok = raw.filter((it) => it?.title?.trim() && isLayoutCarbonIcon(it?.iconHint));
  if (ok.length < 3) {
    throw layoutError(
      "features",
      "need ≥3 items with title and iconHint from layout Carbon allowlist",
    );
  }
}

export function assertProcessLayout(props) {
  const ok = (props.steps ?? []).filter(
    (it) => it?.title?.trim() && isLayoutCarbonIcon(it?.iconHint),
  );
  if (ok.length < 3) {
    throw layoutError(
      "process",
      "need ≥3 steps with title and iconHint from layout Carbon allowlist",
    );
  }
}

/** Char caps — keep in sync with layout-catalog SPOTLIGHT_CONTENT_LIMITS / fields[].limit. */
export const SPOTLIGHT_CONTENT_LIMITS = Object.freeze({
  maxKickerChars: 28,
  maxH1Chars: 42,
  maxDescChars: 90,
  maxPairTitleChars: 18,
  maxPairBodyChars: 48,
  pairCount: 4,
});

const SPOTLIGHT_PALETTES = new Set([
  "cream",
  "ink",
  "auto",
  "ocean",
  "forest",
  "slate",
  "amber",
  "wine",
  "neon",
  "sunset",
  "candy",
  "volt",
]);

export function isSpotlightPalette(palette) {
  return SPOTLIGHT_PALETTES.has(String(palette ?? "").trim());
}

/**
 * Spotlight: local image + palette + exactly 4 title/body pairs within char caps.
 * Body H1/description length checked via assertSpotlightBodyContent when body is available.
 */
export function assertSpotlightLayout(props) {
  if (!isLocalImagePath(props.image)) {
    throw layoutError("spotlight", "local image: path is required (not http)");
  }
  if (!isSpotlightPalette(props.palette)) {
    throw layoutError(
      "spotlight",
      `palette must be one of cream|ink|auto|ocean|forest|slate|amber|wine|neon|sunset|candy|volt (got ${JSON.stringify(props.palette)})`,
    );
  }
  const raw = preferList(props.items, props.cards);
  const ok = raw.filter((it) => it?.title?.trim() && it?.body?.trim());
  if (ok.length !== SPOTLIGHT_CONTENT_LIMITS.pairCount) {
    throw layoutError(
      "spotlight",
      `need exactly ${SPOTLIGHT_CONTENT_LIMITS.pairCount} items with title and body (got ${ok.length})`,
    );
  }
  for (let i = 0; i < ok.length; i++) {
    const it = ok[i];
    const title = String(it.title ?? "").trim();
    const body = String(it.body ?? "").trim();
    if (title.length > SPOTLIGHT_CONTENT_LIMITS.maxPairTitleChars) {
      throw layoutError(
        "spotlight",
        `items[${i}].title too long (${title.length}>${SPOTLIGHT_CONTENT_LIMITS.maxPairTitleChars} chars); see layout-get fields[].limit`,
      );
    }
    if (body.length > SPOTLIGHT_CONTENT_LIMITS.maxPairBodyChars) {
      throw layoutError(
        "spotlight",
        `items[${i}].body too long (${body.length}>${SPOTLIGHT_CONTENT_LIMITS.maxPairBodyChars} chars); see layout-get fields[].limit`,
      );
    }
  }
  const kicker = props.kicker != null ? String(props.kicker).trim() : "";
  if (kicker && kicker.length > SPOTLIGHT_CONTENT_LIMITS.maxKickerChars) {
    throw layoutError(
      "spotlight",
      `kicker too long (${kicker.length}>${SPOTLIGHT_CONTENT_LIMITS.maxKickerChars} chars); see layout-get fields[].limit`,
    );
  }
}

/** Parse H1 + first paragraph from slide body; enforce char caps. */
export function assertSpotlightBodyContent(body) {
  const text = String(body ?? "");
  if (!/(?:^|\n)#\s+\S/.test(text)) {
    throw layoutError("spotlight", "body needs H1 title");
  }
  const h1 = (text.match(/(?:^|\n)#\s+(.+)/) || [])[1]?.trim() ?? "";
  if (!h1) {
    throw layoutError("spotlight", "body needs H1 title");
  }
  if (h1.length > SPOTLIGHT_CONTENT_LIMITS.maxH1Chars) {
    throw layoutError(
      "spotlight",
      `H1 too long (${h1.length}>${SPOTLIGHT_CONTENT_LIMITS.maxH1Chars} chars); see layout-get fields[].limit`,
    );
  }
  const afterH1 = text.replace(/(?:^|\n)#\s+.+\n?/, "");
  const desc =
    (afterH1.match(/^\s*(?![-*+#])(\S[^\n]*)/m) || [])[1]?.trim() ?? "";
  if (!desc) {
    throw layoutError("spotlight", "body needs a description line under H1");
  }
  if (desc.length > SPOTLIGHT_CONTENT_LIMITS.maxDescChars) {
    throw layoutError(
      "spotlight",
      `description too long (${desc.length}>${SPOTLIGHT_CONTENT_LIMITS.maxDescChars} chars); see layout-get fields[].limit`,
    );
  }
}
