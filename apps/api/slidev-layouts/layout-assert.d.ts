export function layoutError(name: string, message: string): Error;
export function isLocalImagePath(image?: string | null): boolean;
export function preferList<T>(...lists: Array<T[] | null | undefined>): T[];

export const CARBON_LAYOUT_ICON_NAMES: readonly string[];
export function layoutCarbonIconHints(): string[];
export function resolveCarbonIconName(hint?: string | null): string | null;
export function isLayoutCarbonIcon(hint?: string | null): boolean;
export function renderCarbonSvg(
  hint: string | null | undefined,
  heightPx: string,
): {
  attributes: Record<string, string>;
  body: string;
} | null;

export function assertStatsLayout(props: {
  items?: Array<{ value?: string; label?: string }> | null;
  stats?: Array<{ value?: string; label?: string }> | null;
}): void;

export function assertCardsLayout(props: {
  items?: Array<{ title?: string }> | null;
  cards?: Array<{ title?: string }> | null;
}): void;

export function assertSkillsLayout(props: {
  items?: Array<{ name?: string }> | null;
}): void;

export function assertTimelineLayout(props: {
  steps?: Array<{ title?: string }> | null;
}): void;

export function assertIconLayout(props: { iconHint?: string | null }): void;

export function assertImageLayout(
  name: "image-left" | "image-right",
  props: { image?: string | null },
): void;

export function assertHeroLayout(props: {
  variant?: string | null;
  image?: string | null;
}): void;

export function assertQuoteLayout(opts: { hasBodySlot: boolean }): void;
export function assertFactLayout(opts: { hasBodySlot: boolean }): void;
export function assertStatementLayout(opts: { hasBodySlot: boolean }): void;
export function assertTwoColsLayout(opts: {
  hasLeftSlot: boolean;
  hasRightSlot: boolean;
}): void;

export function assertFeaturesLayout(props: {
  items?: Array<{ title?: string; iconHint?: string }> | null;
  features?: Array<{ title?: string; iconHint?: string }> | null;
}): void;

export function assertProcessLayout(props: {
  steps?: Array<{ title?: string; iconHint?: string }> | null;
}): void;

export const SPOTLIGHT_CONTENT_LIMITS: {
  readonly maxKickerChars: 28;
  readonly maxH1Chars: 42;
  readonly maxDescChars: 90;
  readonly maxPairTitleChars: 18;
  readonly maxPairBodyChars: 48;
  readonly pairCount: 4;
};

export function isSpotlightPalette(palette?: string | null): boolean;

export function assertSpotlightLayout(props: {
  image?: string | null;
  palette?: string | null;
  kicker?: string | null;
  items?: Array<{ title?: string; body?: string }> | null;
  cards?: Array<{ title?: string; body?: string }> | null;
}): void;

export function assertSpotlightBodyContent(body: string): void;
