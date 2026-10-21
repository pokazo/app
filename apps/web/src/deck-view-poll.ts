/** UUID deck id (same rule as API /api/view/:id). */
export const DECK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDeckId(id: string): boolean {
  return DECK_ID_RE.test(id);
}

/**
 * Live structure (move/insert/delete) only rewrites markdown. Do not lock the
 * filmstrip or show the progressive "rest of the deck" line for that.
 */
/**
 * A /api/view fetch that started before the edit POST can return the new order
 * before the client records that the POST was accepted. Applying it swaps
 * thumb paths while the cache key is still the previous one.
 */
export function viewPollKeepsLocalSlides(opts: {
  liveStructure: boolean;
  editAccepted: boolean;
  pollAfterAccept: boolean;
  /** Live move/insert/delete POST has not returned yet. */
  structureInflight?: boolean;
}): boolean {
  if (opts.structureInflight) return true;
  if (opts.liveStructure) return true;
  return opts.editAccepted && !opts.pollAfterAccept;
}

/** Stop /api/view polling only once a response that started after the POST is idle. */
export function viewPollStops(opts: {
  serverBuilding: boolean;
  rewriteBusy: boolean;
  editAccepted: boolean;
  pollAfterAccept: boolean;
  structureInflight?: boolean;
}): boolean {
  if (opts.structureInflight) return false;
  if (opts.serverBuilding || opts.rewriteBusy) return false;
  if (opts.editAccepted && !opts.pollAfterAccept) return false;
  return true;
}

export function deckEditBlocksUi(opts: {
  serverBuilding: boolean;
  livePreview?: boolean;
  editKind?: string | null;
}): boolean {
  if (!opts.serverBuilding) return false;
  if (opts.livePreview && opts.editKind === "structure") return false;
  return true;
}

/**
 * Keep polling /api/view until the first successful response (preview/ready dist),
 * then while progressive compose / single-slide rewrite is still running.
 */
export function shouldPollDeckView(opts: {
  hasMeta: boolean;
  building: boolean;
  /** Client forced poll after POST rewrite (until server building catches up). */
  forcePoll?: boolean;
  /** Local rewrite in flight — keep polling even if a poll missed server building=true. */
  rewriteBusy?: boolean;
}): boolean {
  return (
    !opts.hasMeta ||
    opts.building ||
    Boolean(opts.forcePoll) ||
    Boolean(opts.rewriteBusy)
  );
}

/**
 * True when POST rewrite/structure is still showing busy but /api/view no longer
 * reports a rewrite.
 *
 * `seenServerBuilding` must be true: after POST the client sets rewriteBusy before
 * the server writes rewrite.json; an early poll with building=false must not clear
 * busy (that re-enabled the form and caused 409 busy on a second click).
 */
export function shouldClearRewriteBusy(opts: {
  rewriteBusy: boolean;
  serverBuilding: boolean;
  rewritingSlide?: number | null;
  /** At least one /api/view poll saw building=true since this edit started. */
  seenServerBuilding: boolean;
  /**
   * This poll started after the edit POST resolved.
   * Live HMR structure ops finish in tens of ms, so a 1s poll can miss
   * building=true entirely and would otherwise hold the UI forever.
   * A poll that started before the POST can still show pre-edit idle — ignore it.
   */
  pollAfterAccept?: boolean;
}): boolean {
  const observed = opts.seenServerBuilding || Boolean(opts.pollAfterAccept);
  return (
    opts.rewriteBusy &&
    observed &&
    !opts.serverBuilding &&
    (opts.rewritingSlide == null || opts.rewritingSlide === undefined)
  );
}

/** Soft copy while dist is not ready yet (hero preview pending). */
export const VIEW_WAITING_NOTE =
  "Собираем презентацию… первый слайд появится здесь автоматически.";

export const VIEW_NOT_FOUND_ERR = "Презентация ещё не готова или ссылка неверная.";

/**
 * While compose is still running, each progressive dist rebuild grows the slide list.
 * Remount the player and focus the newest page so pages appear one-by-one.
 */
export function progressiveSlideReveal(opts: {
  prevCount: number;
  nextCount: number;
  building: boolean;
}): { remount: boolean; focusSlide: number | null } {
  if (opts.building && opts.prevCount > 0 && opts.nextCount > opts.prevCount) {
    return { remount: true, focusSlide: opts.nextCount };
  }
  return { remount: false, focusSlide: null };
}
