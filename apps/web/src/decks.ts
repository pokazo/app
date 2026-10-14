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
  preview: "Слайды появляются по мере сборки",
  building: "Собираем показ",
  ready: "Готово",
  failed: "Не собралось",
};

export function deckStatusLabel(status: string) {
  return DECK_STATUS_LABEL[status] ?? status;
}

/** Prefer live 2-word model activity while the deck is busy. */
export function deckBusyLabel(status: string, activity?: string | null) {
  const live = (activity ?? "").trim();
  if (live && deckBusy(status)) return live;
  return deckStatusLabel(status);
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

/** CSS mini-slide character for ThemePicker thumbs. */
export type ThemePreviewId =
  | "auto"
  | "default"
  | "seriph"
  | "apple-basic"
  | "bricks"
  | "shibainu"
  | "ink-dark"
  | "brand-auto"
  | "ocean"
  | "forest"
  | "slate"
  | "amber"
  | "wine";

export type DeckTheme = {
  id: string;
  title: string;
  hint: string;
  preview: ThemePreviewId;
  colors: string[];
};

export const DECK_THEMES: DeckTheme[] = [
  { id: "auto", title: "Авто", hint: "Нейросеть подберёт", preview: "auto", colors: ["#6d28d9", "#ec4899", "#22c55e", "#3b82f6"] },
  { id: "default", title: "Чистый свет", hint: "Универсальный", preview: "default", colors: ["#f4f4f5", "#5d8392", "#0f1220"] },
  { id: "seriph", title: "Serif", hint: "Доклад и наука", preview: "seriph", colors: ["#f8f4e8", "#2c1810", "#c4a574"] },
  { id: "apple-basic", title: "Keynote", hint: "Бизнес, минимум", preview: "apple-basic", colors: ["#ffffff", "#111111", "#9ca3af"] },
  { id: "bricks", title: "Кирпичи", hint: "Яркие блоки", preview: "bricks", colors: ["#e85d4c", "#f4d35e", "#2a9d8f"] },
  { id: "shibainu", title: "Тёплый", hint: "Школа и рассказ", preview: "shibainu", colors: ["#f4e4d4", "#c45c26", "#3d2b1f"] },
  { id: "ink-dark", title: "Тёмный", hint: "Редакционный тёмный", preview: "ink-dark", colors: ["#191b1e", "#ffffff", "#c8102e"] },
  { id: "brand-auto", title: "Автобренд", hint: "Тёмный + красный акцент", preview: "brand-auto", colors: ["#191b1e", "#c8102e", "#ffffff"] },
  { id: "ocean", title: "Океан", hint: "Cool corporate", preview: "ocean", colors: ["#e8eef2", "#1a2b3c", "#2d6a8f"] },
  { id: "forest", title: "Мох", hint: "ESG и природа", preview: "forest", colors: ["#eef2eb", "#1c2a1f", "#3d6b4f"] },
  { id: "slate", title: "Сланец", hint: "Тёмный SaaS без красного", preview: "slate", colors: ["#1e2228", "#f0f2f5", "#6b9bd1"] },
  { id: "amber", title: "Янтарь", hint: "Premium и finance", preview: "amber", colors: ["#1a1814", "#f5f0e6", "#c9a227"] },
  { id: "wine", title: "Бордо", hint: "Редакционный бордо", preview: "wine", colors: ["#1f1418", "#f6ecef", "#8b3a4a"] },
];

const THEME_IDS = new Set(DECK_THEMES.map((t) => t.id));

export function sanitizeDeckTheme(raw: string | null | undefined) {
  const id = (raw ?? "").trim();
  return THEME_IDS.has(id) ? id : "auto";
}

/** Matches API clamp in POST /api/decks. */
export const SLIDE_COUNT_MIN = 3;
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
