import { describe, expect, it, vi } from "vitest";
import type { OutlineT } from "./outline.js";
import {
  formatOutlinePlanIssues,
  refineOutlineUntilValid,
  validateOutlinePlan,
} from "./outline-plan.js";

const base = {
  imageQuery: "",
  iconHint: "",
  kicker: "",
  source: "",
  steps: [] as const,
  stats: [] as const,
  skills: [] as const,
};

function richEight(): OutlineT {
  return {
    title: "Богатая колода",
    slides: [
      {
        heading: "Старт",
        points: ["Короткий лид"],
        intent: "open",
        visual: "hero",
        ...base,
        kicker: "ТЕМА",
        imageQuery: "city skyline evening river",
      },
      {
        heading: "Место",
        points: ["А", "Б", "В"],
        intent: "geo",
        visual: "image-right",
        ...base,
        imageQuery: "river landscape map view",
      },
      {
        heading: "Путь",
        points: [],
        intent: "timeline",
        visual: "timeline",
        ...base,
        steps: [
          { phase: "1", title: "Начало", body: "Основание", state: "done" },
          { phase: "2", title: "Рост", body: "Развитие", state: "current" },
          { phase: "3", title: "Сейчас", body: "Современность", state: "todo" },
        ],
      },
      {
        heading: "Экономика",
        points: ["Порт", "Заводы"],
        intent: "eco",
        visual: "image-left",
        ...base,
        imageQuery: "industrial port cranes",
      },
      {
        heading: "Цифры",
        points: [],
        intent: "stats",
        visual: "stats",
        ...base,
        stats: [
          { value: "1M", label: "Людей", note: "оценка" },
          { value: "150+", label: "Школ", note: "город" },
        ],
      },
      {
        heading: "Навыки",
        points: [],
        intent: "skills",
        visual: "skills",
        ...base,
        skills: [
          { name: "Kotlin", level: "expert", pct: 90 },
          { name: "Android", level: "advanced", pct: 80 },
        ],
      },
      {
        heading: "Иконки",
        points: ["Спорт", "Парки"],
        intent: "icon",
        visual: "icon",
        ...base,
        iconHint: "sports, park",
      },
      {
        heading: "Дальше",
        points: ["План А", "План Б", "План В", "План Г"],
        intent: "future",
        visual: "two-cols",
        ...base,
      },
    ],
  };
}

describe("validateOutlinePlan", () => {
  it("accepts a rich plan with no empty or text-only slides", () => {
    expect(validateOutlinePlan(richEight(), { slideCount: 8 })).toEqual([]);
  });

  it("rejects empty heading / empty photo slide", () => {
    const outline: OutlineT = {
      title: "X",
      slides: [
        { heading: "  ", points: ["a"], intent: "x", visual: "hero", ...base, imageQuery: "x" },
        {
          heading: "Фото без текста",
          points: [],
          intent: "x",
          visual: "image-right",
          ...base,
          imageQuery: "office desk laptop",
        },
        {
          heading: "Ок",
          points: ["a", "b"],
          intent: "x",
          visual: "image-left",
          ...base,
          imageQuery: "library books shelf",
        },
        {
          heading: "Ок2",
          points: ["a"],
          intent: "x",
          visual: "quote",
          ...base,
        },
      ],
    };
    const issues = validateOutlinePlan(outline);
    expect(issues.some((i) => i.code === "empty_slide")).toBe(true);
    expect(issues.map((i) => i.message).join("\n")).toMatch(/пустой heading/i);
    expect(issues.map((i) => i.message).join("\n")).toMatch(/без points/i);
  });

  it("rejects text-only default / none slides", () => {
    const outline: OutlineT = {
      title: "Бедная",
      slides: [
        {
          heading: "Только буллеты",
          points: ["один", "два", "три"],
          intent: "text",
          visual: "default",
          ...base,
        },
        {
          heading: "Cover ok",
          points: ["лид"],
          intent: "open",
          visual: "cover",
          ...base,
          imageQuery: "abstract gradient light",
          kicker: "HI",
        },
        {
          heading: "Ещё текст",
          points: ["a"],
          intent: "x",
          visual: "none",
          ...base,
        },
        {
          heading: "Конец",
          points: ["спасибо"],
          intent: "end",
          visual: "end",
          ...base,
        },
      ],
    };
    const issues = validateOutlinePlan(outline);
    const textOnly = issues.filter((i) => i.code === "text_only");
    expect(textOnly.length).toBeGreaterThanOrEqual(2);
    expect(textOnly.some((i) => i.message.includes("default"))).toBe(true);
    expect(textOnly.some((i) => i.message.includes("none") || i.message.includes("end"))).toBe(
      true,
    );
  });

  it("rejects timeline/stats/skills without payload", () => {
    const outline: OutlineT = {
      title: "Broken",
      slides: [
        {
          heading: "T",
          points: [],
          intent: "t",
          visual: "timeline",
          ...base,
        },
        {
          heading: "S",
          points: [],
          intent: "s",
          visual: "stats",
          ...base,
        },
        {
          heading: "K",
          points: [],
          intent: "k",
          visual: "skills",
          ...base,
        },
        {
          heading: "Photo",
          points: ["ok"],
          intent: "p",
          visual: "image-right",
          ...base,
          imageQuery: "bridge over river",
        },
      ],
    };
    const msg = formatOutlinePlanIssues(validateOutlinePlan(outline));
    expect(msg).toMatch(/timeline/i);
    expect(msg).toMatch(/stats/i);
    expect(msg).toMatch(/skills/i);
  });

  it("rejects wrong slide count", () => {
    const issues = validateOutlinePlan(richEight(), { slideCount: 6 });
    expect(issues.some((i) => i.code === "slide_count")).toBe(true);
  });
});

describe("refineOutlineUntilValid", () => {
  it("returns immediately when plan already valid", async () => {
    const revise = vi.fn();
    const result = await refineOutlineUntilValid({
      initial: richEight(),
      slideCount: 8,
      revise,
    });
    expect(result.issues).toEqual([]);
    expect(result.attempts).toBe(1);
    expect(revise).not.toHaveBeenCalled();
  });

  it("sends issues to revise and accepts fixed plan", async () => {
    const broken: OutlineT = {
      title: "Fix me",
      slides: [
        {
          heading: "Только текст",
          points: ["a", "b"],
          intent: "bad",
          visual: "default",
          ...base,
        },
        {
          heading: "Пусто",
          points: [],
          intent: "bad",
          visual: "image-right",
          ...base,
          imageQuery: "",
        },
        {
          heading: "Ок",
          points: ["x"],
          intent: "ok",
          visual: "quote",
          ...base,
        },
        {
          heading: "Ок2",
          points: ["y", "z"],
          intent: "ok",
          visual: "fact",
          ...base,
        },
      ],
    };

    const revise = vi.fn(async (_current, issues) => {
      expect(issues.length).toBeGreaterThan(0);
      expect(formatOutlinePlanIssues(issues)).toMatch(/text_only|empty_slide/);
      return {
        title: "Fixed",
        slides: [
          {
            heading: "Только текст → фото",
            points: ["a", "b"],
            intent: "fixed",
            visual: "image-left",
            ...base,
            imageQuery: "student studying laptop desk",
          },
          {
            heading: "Пусто → hero",
            points: ["Лид"],
            intent: "fixed",
            visual: "hero",
            ...base,
            kicker: "HI",
            imageQuery: "sunrise over hills",
          },
          {
            heading: "Ок",
            points: ["x"],
            intent: "ok",
            visual: "quote",
            ...base,
          },
          {
            heading: "Ок2",
            points: ["y", "z"],
            intent: "ok",
            visual: "fact",
            ...base,
          },
        ],
      } satisfies OutlineT;
    });

    const result = await refineOutlineUntilValid({
      initial: broken,
      slideCount: 4,
      maxAttempts: 3,
      revise,
    });
    expect(revise).toHaveBeenCalledTimes(1);
    expect(result.attempts).toBe(2);
    expect(result.issues).toEqual([]);
    expect(result.outline.title).toBe("Fixed");
  });

  it("stops after maxAttempts and returns remaining issues", async () => {
    const stubborn: OutlineT = {
      title: "No",
      slides: [
        { heading: "A", points: ["1"], intent: "a", visual: "default", ...base },
        { heading: "B", points: ["1"], intent: "b", visual: "default", ...base },
        { heading: "C", points: ["1"], intent: "c", visual: "default", ...base },
        { heading: "D", points: ["1"], intent: "d", visual: "default", ...base },
      ],
    };
    const revise = vi.fn(async () => stubborn);
    const result = await refineOutlineUntilValid({
      initial: stubborn,
      slideCount: 4,
      maxAttempts: 3,
      revise,
    });
    expect(revise).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(3);
    expect(result.issues.some((i) => i.code === "text_only")).toBe(true);
  });
});
