import type { OutlineT, OutlineSlide } from "./outline.js";

export type OutlinePlanIssue = {
  /** 1-based slide index; omit for deck-level issues */
  slide?: number;
  code: "empty_slide" | "text_only" | "slide_count" | "empty_title";
  message: string;
};

const PHOTO_VISUALS = new Set(["cover", "hero", "image-right", "image-left", "image"]);
const TEXT_ONLY_VISUALS = new Set(["none", "default", "center", "section", "intro", "end"]);

function nonEmptyStrings(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

function slideLabel(index: number, slide: OutlineSlide): string {
  const h = slide.heading?.trim() || "(без заголовка)";
  return `Слайд ${index} «${h}»`;
}

/** Empty: no heading, or no usable content for the chosen visual. */
export function emptySlideIssues(index: number, slide: OutlineSlide): OutlinePlanIssue[] {
  const label = slideLabel(index, slide);
  const heading = slide.heading?.trim() ?? "";
  if (!heading) {
    return [{ slide: index, code: "empty_slide", message: `${label}: пустой heading` }];
  }

  const points = nonEmptyStrings(slide.points ?? []);
  const visual = slide.visual;

  if (visual === "timeline") {
    const steps = (slide.steps ?? []).filter((s) => s.title?.trim() && s.body?.trim());
    if (steps.length < 3) {
      return [
        {
          slide: index,
          code: "empty_slide",
          message: `${label}: timeline пустой — нужно ≥3 steps с title и body (сейчас ${steps.length})`,
        },
      ];
    }
    return [];
  }

  if (visual === "stats") {
    const stats = (slide.stats ?? []).filter((s) => s.value?.trim() && s.label?.trim());
    if (stats.length < 2) {
      return [
        {
          slide: index,
          code: "empty_slide",
          message: `${label}: stats пустой — нужно ≥2 stats с value и label (сейчас ${stats.length})`,
        },
      ];
    }
    return [];
  }

  if (visual === "skills") {
    const skills = (slide.skills ?? []).filter((s) => s.name?.trim());
    if (skills.length < 2) {
      return [
        {
          slide: index,
          code: "empty_slide",
          message: `${label}: skills пустой — нужно ≥2 skills с name (сейчас ${skills.length})`,
        },
      ];
    }
    return [];
  }

  if (visual === "cards") {
    const cards = (slide.cards ?? []).filter((c) => c.title?.trim());
    if (cards.length < 2) {
      return [
        {
          slide: index,
          code: "empty_slide",
          message: `${label}: cards пустой — нужно ≥2 cards с title (сейчас ${cards.length})`,
        },
      ];
    }
    return [];
  }

  if (visual === "icon") {
    if (!slide.iconHint?.trim()) {
      return [{ slide: index, code: "empty_slide", message: `${label}: visual=icon без iconHint` }];
    }
    if (points.length < 1) {
      return [{ slide: index, code: "empty_slide", message: `${label}: icon-слайд без points` }];
    }
    return [];
  }

  if (PHOTO_VISUALS.has(visual)) {
    if (!slide.imageQuery?.trim()) {
      return [
        {
          slide: index,
          code: "empty_slide",
          message: `${label}: фото-visual=${visual} без imageQuery`,
        },
      ];
    }
    if (visual === "cover" || visual === "hero") {
      if (points.length < 1 && !(slide.kicker?.trim())) {
        return [
          {
            slide: index,
            code: "empty_slide",
            message: `${label}: ${visual} без текста (нужны points или kicker)`,
          },
        ];
      }
      return [];
    }
    if (points.length < 1) {
      return [{ slide: index, code: "empty_slide", message: `${label}: ${visual} без points` }];
    }
    return [];
  }

  if (visual === "two-cols") {
    if (points.length < 2) {
      return [
        {
          slide: index,
          code: "empty_slide",
          message: `${label}: two-cols пустой — нужно ≥2 points (сейчас ${points.length})`,
        },
      ];
    }
    return [];
  }

  if (visual === "quote" || visual === "fact") {
    if (points.length < 1 && heading.length < 12) {
      return [
        {
          slide: index,
          code: "empty_slide",
          message: `${label}: ${visual} пустой — нужен point или длинный heading`,
        },
      ];
    }
    return [];
  }

  // default / none / center / section / intro / end — no structured payload
  if (points.length < 1) {
    return [{ slide: index, code: "empty_slide", message: `${label}: пустой контент (нет points)` }];
  }
  return [];
}

/** Text-only: bullets/heading without photo, icon, or structured layout payload. */
export function textOnlySlideIssues(index: number, slide: OutlineSlide): OutlinePlanIssue[] {
  const label = slideLabel(index, slide);
  const visual = slide.visual;

  if (TEXT_ONLY_VISUALS.has(visual)) {
    return [
      {
        slide: index,
        code: "text_only",
        message: `${label}: только текст (visual=${visual}). Нужен image-left|image-right|hero|cover|icon|timeline|stats|skills|two-cols|quote|fact|cards с заполненным payload`,
      },
    ];
  }

  if (PHOTO_VISUALS.has(visual) && !slide.imageQuery?.trim()) {
    return [
      {
        slide: index,
        code: "text_only",
        message: `${label}: заявлен фото-layout ${visual}, но нет imageQuery — слайд останется текстовым`,
      },
    ];
  }

  if (visual === "icon" && !slide.iconHint?.trim()) {
    return [
      {
        slide: index,
        code: "text_only",
        message: `${label}: visual=icon без iconHint — останется текстовый список`,
      },
    ];
  }

  if (visual === "timeline" && (slide.steps?.length ?? 0) < 3) {
    return [
      {
        slide: index,
        code: "text_only",
        message: `${label}: timeline без steps — останется заголовок`,
      },
    ];
  }

  if (visual === "stats" && (slide.stats?.length ?? 0) < 2) {
    return [
      {
        slide: index,
        code: "text_only",
        message: `${label}: stats без цифр — останется заголовок`,
      },
    ];
  }

  if (visual === "skills" && (slide.skills?.length ?? 0) < 2) {
    return [
      {
        slide: index,
        code: "text_only",
        message: `${label}: skills без skills[] — останется заголовок`,
      },
    ];
  }

  if (visual === "cards" && (slide.cards?.length ?? 0) < 2) {
    return [
      {
        slide: index,
        code: "text_only",
        message: `${label}: cards без cards[] — останется заголовок`,
      },
    ];
  }

  return [];
}

export function validateOutlinePlan(
  outline: OutlineT,
  opts?: { slideCount?: number },
): OutlinePlanIssue[] {
  const issues: OutlinePlanIssue[] = [];
  if (!outline.title?.trim()) {
    issues.push({ code: "empty_title", message: "Пустой title колоды" });
  }
  if (opts?.slideCount && outline.slides.length !== opts.slideCount) {
    issues.push({
      code: "slide_count",
      message: `Число слайдов ${outline.slides.length}, ожидалось ${opts.slideCount}`,
    });
  }
  outline.slides.forEach((slide, i) => {
    const index = i + 1;
    issues.push(...emptySlideIssues(index, slide));
    // text-only only if not already flagged empty for the same structural gap
    const textIssues = textOnlySlideIssues(index, slide);
    for (const issue of textIssues) {
      const dup = issues.some(
        (x) => x.slide === issue.slide && (x.code === "empty_slide" || x.code === "text_only"),
      );
      if (!dup) issues.push(issue);
    }
  });
  return issues;
}

export function formatOutlinePlanIssues(issues: OutlinePlanIssue[]): string {
  return issues.map((i, n) => `${n + 1}. [${i.code}] ${i.message}`).join("\n");
}

/**
 * Keeps calling revise() while plan tests fail.
 * Does not invent slide content — only the model revises.
 */
export async function refineOutlineUntilValid(opts: {
  initial: OutlineT;
  slideCount: number;
  maxAttempts?: number;
  revise: (current: OutlineT, issues: OutlinePlanIssue[]) => Promise<OutlineT>;
}): Promise<{ outline: OutlineT; attempts: number; issues: OutlinePlanIssue[] }> {
  const maxAttempts = opts.maxAttempts ?? 3;
  let current = opts.initial;
  let issues = validateOutlinePlan(current, { slideCount: opts.slideCount });
  let attempts = 1;

  while (issues.length > 0 && attempts < maxAttempts) {
    current = await opts.revise(current, issues);
    attempts += 1;
    issues = validateOutlinePlan(current, { slideCount: opts.slideCount });
  }

  return { outline: current, attempts, issues };
}
