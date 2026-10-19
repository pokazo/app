/** UUID deck id (same rule as API /api/view/:id). */
export const DECK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDeckId(id: string): boolean {
  return DECK_ID_RE.test(id);
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
}): boolean {
  return (
    opts.rewriteBusy &&
    opts.seenServerBuilding &&
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
