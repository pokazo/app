/** Shared layout data contracts. Copied into each deck's layouts/ folder. */

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

export function assertStatsLayout(props) {
  const raw = props.items ?? props.stats ?? [];
  const ok = raw.filter((it) => it?.value?.trim() && it?.label?.trim());
  if (ok.length < 2) {
    throw layoutError("stats", "need ≥2 items with value and label");
  }
}

export function assertCardsLayout(props) {
  const raw = props.items ?? props.cards ?? [];
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
  if (!props.iconHint?.trim()) {
    throw layoutError("icon", "iconHint is required");
  }
}

export function assertImageLayout(name, props) {
  if (!isLocalImagePath(props.image)) {
    throw layoutError(name, "local image: path is required (not http)");
  }
}

const HERO_VARIANTS = new Set(["centered", "fullbleed", "editorial", "product"]);

export function assertHeroLayout(props) {
  const v = props.variant?.trim() || "";
  if (!HERO_VARIANTS.has(v)) {
    throw layoutError(
      "hero",
      `variant must be centered|fullbleed|editorial|product, got ${JSON.stringify(props.variant)}`,
    );
  }
  if ((v === "fullbleed" || v === "product") && !isLocalImagePath(props.image)) {
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
  const raw = props.items ?? props.features ?? [];
  const ok = raw.filter((it) => it?.title?.trim() && it?.iconHint?.trim());
  if (ok.length < 3) {
    throw layoutError("features", "need ≥3 items with title and iconHint");
  }
}

export function assertProcessLayout(props) {
  const ok = (props.steps ?? []).filter((it) => it?.title?.trim() && it?.iconHint?.trim());
  if (ok.length < 3) {
    throw layoutError("process", "need ≥3 steps with title and iconHint");
  }
}
