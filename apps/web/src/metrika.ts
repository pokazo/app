/** Yandex.Metrika counter on pokazo.ru (see apps/web/index.html). */
export const METRIKA_COUNTER_ID = 113441492;

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

/** `data-pk="cta-create"` → JS goal id `cta_create`. */
export function pkGoalId(dataPk: string): string {
  return dataPk.trim().replace(/-/g, "_");
}

export function reachPkGoal(dataPk: string): void {
  const goal = pkGoalId(dataPk);
  window.ym?.(METRIKA_COUNTER_ID, "reachGoal", goal);
}

export function initPkMetrika(): void {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("[data-pk]");
      const dataPk = el?.getAttribute("data-pk");
      if (!dataPk) return;
      reachPkGoal(dataPk);
    },
    true,
  );
}
