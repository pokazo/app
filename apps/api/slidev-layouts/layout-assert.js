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
  "editorial",
  "product",
]);

const HERO_NEEDS_IMAGE = new Set(["ribbon", "corner", "inset", "fullbleed", "product"]);

export function assertHeroLayout(props) {
  const v = props.variant?.trim() || "";
  if (!HERO_VARIANTS.has(v)) {
    throw layoutError(
      "hero",
      `variant must be ribbon|corner|inset|fullbleed|editorial|product, got ${JSON.stringify(props.variant)}`,
    );
  }
  if (HERO_NEEDS_IMAGE.has(v) && !isLocalImagePath(props.image)) {
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
