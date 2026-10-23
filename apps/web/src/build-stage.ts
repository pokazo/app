/** Ordered steps of a deck build. The rail advances with the live activity label. */
export const BUILD_PHASES = [
  { id: "think", title: "Тема" },
  { id: "facts", title: "Факты" },
  { id: "plan", title: "План" },
  { id: "cover", title: "Обложка" },
  { id: "slides", title: "Слайды" },
  { id: "show", title: "Показ" },
] as const;

/** What the player shows while a deck is still being made. */
export function buildWaitMode(opts: {
  busy: boolean;
  presenting: boolean;
  hasError: boolean;
  slideCount: number;
  rewriteForm: boolean;
}): "scene" | "bar" | "off" {
  if (!opts.busy || opts.presenting || opts.hasError) return "off";
  if (opts.slideCount <= 0) return "scene";
  if (opts.rewriteForm) return "off";
  return "bar";
}

/**
 * Map a live activity phrase onto the build rail.
 * Earlier, more specific phrases win («Собираю превью» stays on the cover).
 */
export function buildPhaseIndex(label: string | null | undefined): number {
  const t = (label ?? "").trim();
  if (!t) return 0;
  if (/превью|обложк/i.test(t)) return 3;
  if (/Собираю/i.test(t)) return 5;
  if (/Пишу слайд|Верстаю|Добавляю|Чиню|Правлю|Проверяю колоду|Меняю тему/i.test(t)) return 4;
  if (/Планирую|план|стиль|Считаю/i.test(t)) return 2;
  if (/факт|фон|фото|Качаю|Рисую/i.test(t)) return 1;
  return 0;
}
