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
}): boolean {
  return !opts.hasMeta || opts.building || Boolean(opts.forcePoll);
}

/** Soft copy while dist is not ready yet (hero preview pending). */
export const VIEW_WAITING_NOTE =
  "Собираем презентацию… первый слайд появится здесь автоматически.";

export const VIEW_NOT_FOUND_ERR = "Презентация ещё не готова или ссылка неверная.";
