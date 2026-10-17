import { layoutCatalogById } from "./layout-catalog.js";
import { safeParseOutline, type OutlineT } from "./outline.js";
import {
  formatOutlinePlanIssues,
  type OutlinePlanIssue,
  validateOutlinePlan,
} from "./outline-plan.js";

/** Contract snippet from layout catalog for the model to fix payload. */
export type OutlineExpect = {
  outlineFields: string;
  antiPatterns: string;
  example: string;
  iconHints?: string[];
};

export type OutlineValidateIssue = OutlinePlanIssue & {
  visual?: string;
  expect: OutlineExpect;
};

export type OutlineValidateOk = {
  ok: true;
  outline: OutlineT;
  title: string;
  slides: number;
};

export type OutlineValidateFail = {
  ok: false;
  issues: OutlineValidateIssue[];
};

export type OutlineValidateResult = OutlineValidateOk | OutlineValidateFail;

const SCHEMA_EXPECT: OutlineExpect = {
  outlineFields:
    "Outline: { title, slides[] }. Each slide: heading, points≤5, intent, visual, imageQuery, iconHint, kicker, source, steps, stats, skills, cards, features≤3, process≤5, palette, pie≤5, chartTitle",
  antiPatterns: "Missing required slide fields; wrong types; slides outside 3–16",
  example:
    '{ "title": "Deck", "slides": [{ "heading": "…", "points": [], "intent": "…", "visual": "features", "imageQuery": "", "iconHint": "", "kicker": "", "source": "", "steps": [], "stats": [], "skills": [], "cards": [], "features": [{"title":"A","body":"…","iconHint":"carbon-idea"},{"title":"B","body":"…","iconHint":"carbon-security"},{"title":"C","body":"…","iconHint":"carbon-rocket"}], "process": [], "palette": "", "pie": [], "chartTitle": "" }] }',
};

const UNKNOWN_VISUAL_EXPECT: OutlineExpect = {
  outlineFields: "Use a catalog visual id from layout-list / layout-match",
  antiPatterns: "none|default|center|section|intro|end or unknown layout ids",
  example: "Call layout-get for the chosen id and fill outlineFields",
};

export function expectForVisual(visual: string | undefined): OutlineExpect {
  if (!visual?.trim()) return UNKNOWN_VISUAL_EXPECT;
  const entry = layoutCatalogById(visual.trim());
  if (!entry) return UNKNOWN_VISUAL_EXPECT;
  return {
    outlineFields: entry.outlineFields,
    antiPatterns: entry.antiPatterns,
    example: entry.example,
    ...(entry.iconHints?.length ? { iconHints: [...entry.iconHints] } : {}),
  };
}

function enrichIssues(
  outline: OutlineT | undefined,
  issues: OutlinePlanIssue[],
): OutlineValidateIssue[] {
  return issues.map((issue) => {
    const slide =
      issue.slide != null && outline ? outline.slides[issue.slide - 1] : undefined;
    const visual = slide?.visual;
    return {
      ...issue,
      ...(visual ? { visual } : {}),
      expect: visual ? expectForVisual(visual) : SCHEMA_EXPECT,
    };
  });
}

/**
 * Validate outline JSON for plan gate. Never throws — always { ok, … }.
 */
export function outlineValidate(
  raw: unknown,
  opts?: { slideCount?: number },
): OutlineValidateResult {
  const parsed = safeParseOutline(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return {
      ok: false,
      issues: [
        {
          code: "empty_slide",
          message: `Schema: ${message}`,
          expect: SCHEMA_EXPECT,
        },
      ],
    };
  }
  const outline = parsed.data;
  const planIssues = validateOutlinePlan(outline, { slideCount: opts?.slideCount });
  if (planIssues.length) {
    return { ok: false, issues: enrichIssues(outline, planIssues) };
  }
  return {
    ok: true,
    outline,
    title: outline.title,
    slides: outline.slides.length,
  };
}

/** Human + machine readable issues for revise prompts (includes expect). */
export function formatOutlineValidateIssues(issues: OutlineValidateIssue[]): string {
  return issues
    .map((i, n) => {
      const head = `${n + 1}. [${i.code}] ${i.message}`;
      const expect = [
        i.visual ? `visual=${i.visual}` : null,
        `expect.outlineFields: ${i.expect.outlineFields}`,
        `expect.antiPatterns: ${i.expect.antiPatterns}`,
        `expect.example: ${i.expect.example}`,
        i.expect.iconHints?.length
          ? `expect.iconHints: ${i.expect.iconHints.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n   ");
      return `${head}\n   ${expect}`;
    })
    .join("\n");
}

/** Bridge: plan issues → enriched string when outline is known. */
export function formatEnrichedPlanIssues(
  outline: OutlineT,
  issues: OutlinePlanIssue[],
): string {
  if (!issues.length) return formatOutlinePlanIssues(issues);
  return formatOutlineValidateIssues(enrichIssues(outline, issues));
}

/** MCP / tool description — exact contract the model must satisfy. */
export const OUTLINE_VALIDATE_TOOL_DESCRIPTION = `Validate a full Pokazo outline JSON against plan rules BEFORE submit_outline. Never crashes — returns { ok: true, title, slides } or { ok: false, issues[] }.

On ok:false each issue has message plus expect { outlineFields, antiPatterns, example, iconHints? } from the layout catalog — fix the slide using expect, then re-call.

Hard payload rules:
- features: exactly 3 items {title, body, iconHint}; iconHint ONLY from layout-get(features).iconHints (carbon-* allowlist)
- process: 3–5 steps {title, iconHint} from the same allowlist
- timeline: ≥3 steps {phase,title,body,state}; stats ≥2; skills ≥2; cards ≥2 (spotlight: exactly 4 cards + palette + imageQuery + points[0]); pie: 3–5 slices + points[0]
- photo layouts (cover|hero|image-right|image-left|spotlight): non-empty imageQuery
- icon: iconHint from allowlist + points
- Forbidden text-only visuals: none|default|center|section|intro|end

Call outline-validate after drafting the outline; only call submit_outline when ok:true. Full icon list: layout-get("features") or layout-get("process") → iconHints.`;
