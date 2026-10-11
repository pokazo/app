export const APP_HISTORY_PATH = "/app/history";

export type Deck = {
  deckId: string;
  topic: string;
  status: string;
  error: string | null;
  slideCount: number;
  createdAt: string;
  viewUrl: string | null;
};

export const DECK_STATUS_LABEL: Record<string, string> = {
  queued: "В очереди",
  generating: "Пишем слайды",
  preview: "Первый слайд готов — собираем остальные",
  building: "Собираем показ",
  ready: "Готово",
  failed: "Не собралось",
};

export function deckStatusLabel(status: string) {
  return DECK_STATUS_LABEL[status] ?? status;
}

export function deckBusy(status: string) {
  return (
    status === "queued" ||
    status === "generating" ||
    status === "preview" ||
    status === "building"
  );
}

/** Deck can be opened in the player while the rest still generates. */
export function deckViewable(status: string) {
  return status === "preview" || status === "ready";
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type DeckTheme = {
  id: string;
  title: string;
  hint: string;
  emoji: string;
  colors: string[];
};

export const DECK_THEMES: DeckTheme[] = [
  { id: "auto", title: "Авто", hint: "Нейросеть подберёт", emoji: "✨", colors: ["#6d28d9", "#ec4899", "#22c55e", "#3b82f6"] },
  { id: "default", title: "Чистый свет", hint: "Универсальный", emoji: "◻️", colors: ["#f4f4f5", "#5d8392", "#0f1220"] },
  { id: "seriph", title: "Serif", hint: "Доклад и наука", emoji: "✒️", colors: ["#f8f4e8", "#2c1810", "#c4a574"] },
  { id: "apple-basic", title: "Keynote", hint: "Бизнес, минимум", emoji: "🖥️", colors: ["#ffffff", "#111111", "#9ca3af"] },
  { id: "bricks", title: "Кирпичи", hint: "Яркие блоки", emoji: "🧱", colors: ["#e85d4c", "#f4d35e", "#2a9d8f"] },
  { id: "shibainu", title: "Тёплый", hint: "Школа и рассказ", emoji: "🐕", colors: ["#f4e4d4", "#c45c26", "#3d2b1f"] },
  { id: "ink-dark", title: "Тёмный", hint: "Редакционный тёмный", emoji: "🌑", colors: ["#191b1e", "#ffffff", "#c8102e"] },
  { id: "brand-auto", title: "Автобренд", hint: "Тёмный + красный акцент", emoji: "🚗", colors: ["#191b1e", "#c8102e", "#ffffff"] },
];

const THEME_IDS = new Set(DECK_THEMES.map((t) => t.id));

export function sanitizeDeckTheme(raw: string | null | undefined) {
  const id = (raw ?? "").trim();
  return THEME_IDS.has(id) ? id : "auto";
}

/** Matches API clamp in POST /api/decks. */
export const SLIDE_COUNT_MIN = 6;
export const SLIDE_COUNT_MAX = 16;
export const SLIDE_COUNT_DEFAULT = 8;

export const SLIDE_COUNT_OPTIONS = Array.from(
  { length: SLIDE_COUNT_MAX - SLIDE_COUNT_MIN + 1 },
  (_, i) => SLIDE_COUNT_MIN + i,
);

export function sanitizeSlideCount(raw: string | number | null | undefined) {
  if (raw == null || raw === "") return SLIDE_COUNT_DEFAULT;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return SLIDE_COUNT_DEFAULT;
  return Math.min(SLIDE_COUNT_MAX, Math.max(SLIDE_COUNT_MIN, Math.round(n)));
}
