/** Yandex.Metrika counter on pokazo.ru (see apps/web/index.html). */
export const METRIKA_COUNTER_ID = 113441492;

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

/** JS goal for every interface click. Must exist on the counter. */
export const UI_CLICK_GOAL = "ui_click";

/** `data-pk="cta-create"` → JS goal id `cta_create`. */
export function pkGoalId(dataPk: string): string {
  return dataPk.trim().replace(/-/g, "_");
}

export function pageHitUrl(pathname: string, search = ""): string {
  return `${pathname}${search}`;
}

/**
 * First URL is already sent by the counter snippet. Later client-side
 * navigations must be a separate hit, or the click map stays on `/`.
 */
export function nextMetrikaHit(
  last: string | null,
  url: string,
): { last: string; hit: boolean } {
  if (last === null || last === url) return { last: url, hit: false };
  return { last: url, hit: true };
}

export type ClickSource = {
  dataPk: string | null;
  ariaLabel: string | null;
  text: string | null;
  className: string | null;
  tag: string;
  inputType: string | null;
};

/** Click payload for Metrika. Never includes typed field values. */
export function clickGoalParams(
  path: string,
  source: ClickSource,
): { path: string; pk: string; name: string } {
  const pk = (source.dataPk ?? "").trim();
  if (source.inputType) return { path, pk, name: source.inputType };
  const text = (source.text ?? "").replace(/\s+/g, " ").trim();
  const aria = (source.ariaLabel ?? "").replace(/\s+/g, " ").trim();
  const fromClass = (source.className ?? "").split(/\s+/).find(Boolean) ?? "";
  const name = (aria || text || fromClass || source.tag || "click").slice(0, 80);
  return { path, pk, name: name || "click" };
}

export function clickSourceFromElement(target: Element): ClickSource {
  const pkHost = target.closest("[data-pk]");
  const control =
    target.closest("a, button, [role='button'], input, textarea, select, summary, label") ?? target;
  const inputType =
    control instanceof HTMLInputElement
      ? control.type || "text"
      : control instanceof HTMLTextAreaElement
        ? "textarea"
        : null;
  return {
    dataPk: pkHost?.getAttribute("data-pk") ?? null,
    ariaLabel: control.getAttribute("aria-label"),
    text: inputType ? null : control.textContent,
    className: control.getAttribute("class"),
    tag: control.tagName.toLowerCase(),
    inputType,
  };
}

export function reachPkGoal(dataPk: string): void {
  reachGoal(pkGoalId(dataPk));
}

export function reachGoal(goal: string, params?: Record<string, string>): void {
  if (params) window.ym?.(METRIKA_COUNTER_ID, "reachGoal", goal, params);
  else window.ym?.(METRIKA_COUNTER_ID, "reachGoal", goal);
}

export function trackPageHit(url: string): void {
  window.ym?.(METRIKA_COUNTER_ID, "hit", url, {
    title: typeof document === "undefined" ? "" : document.title,
  });
}

let hitUrl: string | null = null;

/** Returns true when this URL should be sent as a Metrika hit. */
export function notePageUrl(url: string): boolean {
  const next = nextMetrikaHit(hitUrl, url);
  hitUrl = next.last;
  return next.hit;
}

export function resetMetrikaHitUrl(): void {
  hitUrl = null;
}

export function initPkMetrika(): void {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const source = clickSourceFromElement(target);
      if (source.dataPk) reachPkGoal(source.dataPk);
      const path = typeof location === "undefined" ? "" : location.pathname;
      reachGoal(UI_CLICK_GOAL, clickGoalParams(path, source));
    },
    true,
  );
}
