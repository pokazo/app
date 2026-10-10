import { describe, expect, it } from "vitest";
import {
  assertLayoutsInMarkdown,
  parseSlideBlocks,
  parseSimpleYaml,
} from "./layout-md-assert.js";
import {
  BAD_LAYOUT_MARKDOWN,
  LAYOUT_SHOT_ORDER,
  badMarkdownForLayout,
  happyPathLayoutsMarkdown,
} from "./layout-fixtures.js";

describe("parseSimpleYaml", () => {
  it("parses items list", () => {
    const fm = parseSimpleYaml(`layout: stats
items:
  - value: "42"
    label: Ships
  - value: "9"
    label: Teams
`);
    expect(fm.layout).toBe("stats");
    expect(fm.items).toEqual([
      { value: "42", label: "Ships" },
      { value: "9", label: "Teams" },
    ]);
  });

  it("parses bare-dash list items with props on following lines", () => {
    const fm = parseSimpleYaml(`layout: cards
items:
  -
    title: A
    body: one
  -
    title: B
    body: two
`);
    expect(fm.items).toEqual([
      { title: "A", body: "one" },
      { title: "B", body: "two" },
    ]);
  });

  it("keeps all cards when body wraps to indented continuation lines (prod Niva)", () => {
    // Exact shape that crashed buildSlidev: LayoutError[cards] after compose
    // folded a long body across two YAML lines.
    const fm = parseSimpleYaml(`layout: cards
kicker: Почему выбирают Ниву Шевроле
cards:
  - title: Проходимость
    body: Полноприводная система и блокируемый дифференциал обеспечивают уверенное
      движение по бездорожью.
  - title: Низкая стоимость обслуживания
    body: Дешевые запчасти и простота конструкции позволяют экономить на ремонте.
  - title: Популярность в регионах
    body: Автомобиль востребован в сельской местности и среди любителей активного
      отдыха.
`);
    const cards = fm.cards as Array<{ title?: string; body?: string }>;
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.title)).toEqual([
      "Проходимость",
      "Низкая стоимость обслуживания",
      "Популярность в регионах",
    ]);
    expect(cards[0]?.body).toMatch(/движение по бездорожью/);
    expect(cards[2]?.body).toMatch(/активного отдыха/);
  });
});

describe("assertLayoutsInMarkdown cards multiline", () => {
  it("does not throw LayoutError[cards] for folded body lines", () => {
    const md = `---
layout: cards
cards:
  - title: Проходимость
    body: Полноприводная система и блокируемый дифференциал обеспечивают уверенное
      движение по бездорожью.
  - title: Низкая стоимость обслуживания
    body: Дешевые запчасти и простота конструкции позволяют экономить на ремонте.
---

# Преимущества
`;
    expect(() => assertLayoutsInMarkdown(md)).not.toThrow();
  });
});

/**
 * Same failure class as prod Niva: compose emits alias keys (cards/stats/features)
 * and/or folds long scalars across indented lines. buildSlidev must not false-positive.
 */
describe("assertLayoutsInMarkdown compose-shaped YAML", () => {
  it.each([
    {
      name: "stats via stats: + folded note",
      md: `---
layout: stats
stats:
  - value: 500,000+
    label: Выпущено машин
    note: Общее количество с 2002 по 2020 гг. включая все
      модификации и спецверсии.
  - value: "102,691"
    label: Продано на вторичном рынке в 2023
    note: Самый продаваемый б/у внедорожник
      России по данным агрегаторов.
---

# Продажи
`,
    },
    {
      name: "features via features: + folded body",
      md: `---
layout: features
features:
  - title: Clarity
    body: One idea per slide so the audience never
      loses the thread.
    iconHint: carbon-idea
  - title: Trust
    body: Sources and numbers that survive a tough
      Q&A round.
    iconHint: carbon-security
  - title: Pace
    body: Fast compose without sacrificing layout
      variety.
    iconHint: carbon-time
---

# Three pillars
`,
    },
    {
      name: "timeline steps with folded body",
      md: `---
layout: timeline
steps:
  - title: "2002"
    body: Запуск совместного предприятия GM-АвтоВАЗ и
      первой Chevrolet Niva.
  - title: "2010"
    body: Рестайлинг и расширение комплектаций для
      городского сегмента.
  - title: "2020"
    body: Выход GM и переименование в Lada Niva
      Travel с сохранением платформы.
---

# История
`,
    },
    {
      name: "process steps with folded title continuation",
      md: `---
layout: process
steps:
  - title: Research the brief and gather hard
      facts
    iconHint: carbon-search
  - title: Outline layouts via MCP match
    iconHint: carbon-catalog
  - title: Compose slides and stock images
    iconHint: carbon-image
---

# How we work
`,
    },
    {
      name: "skills with folded name lines",
      md: `---
layout: skills
items:
  - name: TypeScript and Vue composition
      API
    pct: "80"
  - name: Slidev and custom layouts
    pct: "70"
---

# Skills
`,
    },
    {
      name: "cards with bare dash then props (YAML block map)",
      md: `---
layout: cards
items:
  -
    title: Проходимость
    body: Полный привод и блокировка
      дифференциала.
  -
    title: Сервис
    body: Дешёвые запчасти и простой
      ремонт.
---

# Плюсы
`,
    },
    {
      name: "cards body: | block scalar keeps ≥2 items",
      md: `---
layout: cards
cards:
  - title: Проходимость
    body: |
      Полный привод
      и блокировка.
  - title: Сервис
    body: |
      Дешёвые запчасти.
---

# Плюсы
`,
    },
    {
      name: "stats note with colon inside unquoted folded line",
      md: `---
layout: stats
items:
  - value: "12+"
    label: Years
    note: Since 2012: continuous delivery in
      production.
  - value: "3×"
    label: Faster
    note: Versus baseline: measured on the
      same hardware.
---

# Numbers
`,
    },
    {
      name: "features alias + empty items key omitted but features present",
      md: `---
layout: features
kicker: Pillars
features:
  - title: A
    body: First pillar with a slightly longer
      explanation.
    iconHint: carbon-idea
  - title: B
    body: Second
    iconHint: carbon-security
  - title: C
    body: Third
    iconHint: carbon-rocket
---

# Features
`,
    },
  ])("accepts $name", ({ md }) => {
    expect(() => assertLayoutsInMarkdown(md)).not.toThrow();
  });
});

describe("assertLayoutsInMarkdown", () => {
  it("accepts happy-path gallery for all custom layouts", () => {
    expect(() => assertLayoutsInMarkdown(happyPathLayoutsMarkdown())).not.toThrow();
    const layouts = parseSlideBlocks(happyPathLayoutsMarkdown())
      .map((b) => b.fm.layout)
      .filter(Boolean);
    for (const name of LAYOUT_SHOT_ORDER) {
      expect(layouts, `gallery missing ${name}`).toContain(name);
    }
  });

  it.each(LAYOUT_SHOT_ORDER)(
    "throws LayoutError[%s] for undrawable %s slide",
    (layout) => {
      const md = badMarkdownForLayout(layout);
      expect(BAD_LAYOUT_MARKDOWN[layout]).toBeTruthy();
      expect(() => assertLayoutsInMarkdown(md)).toThrow(
        new RegExp(`LayoutError\\[${layout}\\]`),
      );
    },
  );
});
