export function layoutError(name: string, message: string): Error;
export function isLocalImagePath(image?: string | null): boolean;

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
export function assertTwoColsLayout(opts: {
  hasLeftSlot: boolean;
  hasRightSlot: boolean;
}): void;
