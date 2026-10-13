import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activityLabelForPhase,
  activityLabelForTools,
  createActivityPublisher,
  readDeckActivity,
  writeDeckActivity,
  wrapToolsWithActivity,
} from "./activity.js";

describe("activityLabelForTools", () => {
  it("maps photo search/download and layout tools to short Russian labels", () => {
    expect(activityLabelForTools(["yandex-image-search"])).toBe("Ищу фон");
    expect(activityLabelForTools(["yandex-image-download"])).toBe("Качаю фото");
    expect(activityLabelForTools(["web-search"])).toBe("Ищу факты");
    expect(activityLabelForTools(["hero-list"])).toBe("Выбираю стиль");
    expect(activityLabelForTools(["hero-get", "yandex-image-search"])).toBe("Ищу фон");
    expect(activityLabelForTools(["slidev-update-slide"])).toBe("Верстаю слайд");
    expect(activityLabelForTools(["slidev-insert-slide"])).toBe("Добавляю слайд");
    expect(activityLabelForTools([])).toBe("Думаю…");
  });
});

describe("activityLabelForPhase", () => {
  it("maps pipeline phases to short Russian labels", () => {
    expect(activityLabelForPhase("research")).toBe("Ищу факты");
    expect(activityLabelForPhase("outline")).toBe("Планирую слайды");
    expect(activityLabelForPhase("hero")).toBe("Делаю обложку");
    expect(activityLabelForPhase("preview")).toBe("Собираю превью");
    expect(activityLabelForPhase("compose")).toBe("Пишу слайды");
    expect(activityLabelForPhase("thinking")).toBe("Думаю…");
    expect(activityLabelForPhase("rewrite")).toBe("Правлю слайд");
    expect(activityLabelForPhase("rewrite-plan")).toBe("Правлю текст");
    expect(activityLabelForPhase("rewrite-build")).toBe("Собираю показ");
  });
});

describe("deck activity file", () => {
  it("writes and reads the latest label", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-activity-"));
    await writeDeckActivity(dir, "Ищу фон");
    await expect(readDeckActivity(dir)).resolves.toEqual({ label: "Ищу фон" });
    const raw = JSON.parse(await readFile(join(dir, "activity.json"), "utf8")) as {
      label: string;
      at: string;
    };
    expect(raw.at).toMatch(/^\d{4}-/);
  });
});

describe("wrapToolsWithActivity", () => {
  it("sets activity when a tool starts executing", async () => {
    const labels: string[] = [];
    const tools = wrapToolsWithActivity(
      {
        "yandex-image-search": {
          description: "search",
          execute: async () => {
            labels.push("inside");
            return { hits: [] };
          },
        },
      },
      async (label) => {
        labels.push(label);
      },
    );
    const tool = tools["yandex-image-search"] as {
      execute: (...args: unknown[]) => Promise<unknown>;
    };
    await tool.execute({});
    expect(labels).toEqual(["Ищу фон", "inside"]);
  });
});

describe("createActivityPublisher", () => {
  it("holds a tool label before flipping back to thinking", async () => {
    const labels: string[] = [];
    const pub = createActivityPublisher({
      write: async (label) => {
        labels.push(label);
      },
      holdMs: 30,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    });
    await pub.set("Качаю фото");
    await pub.thinkAfterHold();
    expect(labels).toEqual(["Качаю фото", "Думаю…"]);
  });

  it("cancels delayed thinking when a newer label arrives", async () => {
    const labels: string[] = [];
    const pub = createActivityPublisher({
      write: async (label) => {
        labels.push(label);
      },
      holdMs: 40,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    });
    await pub.set("Качаю фото");
    const pending = pub.thinkAfterHold();
    await pub.set("Верстаю слайд");
    await pending;
    expect(labels).toEqual(["Качаю фото", "Верстаю слайд"]);
  });
});
