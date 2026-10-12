import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const THINKING = "Думаю…";

const PHASE_LABELS: Record<string, string> = {
  thinking: THINKING,
  "theme-pick": "Выбираю тему",
  research: "Ищу факты",
  outline: "Планирую слайды",
  hero: "Делаю обложку",
  preview: "Собираю превью",
  compose: "Пишу слайды",
  repair: "Чиню слайды",
  final_build: "Собираю показ",
};

/** Higher priority wins when a step calls several tools at once. */
const TOOL_LABELS: Array<{ tools: string[]; label: string }> = [
  {
    tools: ["yandex-image-download", "stock-download", "upload-image-use"],
    label: "Качаю фото",
  },
  {
    tools: ["image-generate"],
    label: "Рисую фон",
  },
  {
    tools: ["web-search"],
    label: "Ищу факты",
  },
  {
    tools: [
      "yandex-image-search",
      "stock-search",
      "upload-image-search",
      "upload-image-list",
    ],
    label: "Ищу фон",
  },
  {
    tools: ["hero-list", "hero-get", "layout-list", "layout-get", "layout-match"],
    label: "Выбираю стиль",
  },
  {
    tools: ["submit_outline"],
    label: "Пишу план",
  },
  {
    tools: ["slidev-insert-slide"],
    label: "Добавляю слайд",
  },
  {
    tools: ["slidev-update-slide"],
    label: "Верстаю слайд",
  },
  {
    tools: ["slidev-remove-slide", "slidev-move-slide"],
    label: "Правлю слайды",
  },
  {
    tools: ["slidev-list-slides", "slidev-get-slide", "slidev-get-info"],
    label: "Проверяю колоду",
  },
];

export function activityLabelForTools(toolNames: string[]): string {
  if (!toolNames.length) return THINKING;
  const set = new Set(toolNames);
  for (const row of TOOL_LABELS) {
    if (row.tools.some((t) => set.has(t))) return row.label;
  }
  return THINKING;
}

export function activityLabelForPhase(phase: string): string {
  return PHASE_LABELS[phase] ?? THINKING;
}

export type DeckActivity = { label: string };

export function deckActivityPath(workDir: string): string {
  return join(workDir, "activity.json");
}

export async function writeDeckActivity(workDir: string, label: string): Promise<void> {
  await writeFile(
    deckActivityPath(workDir),
    JSON.stringify({ label, at: new Date().toISOString() }, null, 2),
    "utf8",
  );
}

export async function readDeckActivity(workDir: string): Promise<DeckActivity | null> {
  try {
    const raw = JSON.parse(await readFile(deckActivityPath(workDir), "utf8")) as {
      label?: unknown;
    };
    if (typeof raw.label !== "string" || !raw.label.trim()) return null;
    return { label: raw.label.trim() };
  } catch {
    return null;
  }
}

type ToolLike = {
  description?: string;
  parameters?: unknown;
  execute?: (...args: unknown[]) => unknown;
};

/** Wrap tool execute so UI can show what the model is doing right now. */
export function wrapToolsWithActivity(
  tools: Record<string, unknown>,
  setActivity: (label: string) => void | Promise<void>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(tools)) {
    const tool = value as ToolLike;
    if (!tool || typeof tool !== "object" || typeof tool.execute !== "function") {
      out[name] = value;
      continue;
    }
    const prev = tool.execute.bind(tool);
    out[name] = {
      ...tool,
      execute: async (...args: unknown[]) => {
        await setActivity(activityLabelForTools([name]));
        return prev(...args);
      },
    };
  }
  return out;
}
