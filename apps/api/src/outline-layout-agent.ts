import { generateObject, generateText, tool } from "ai";
import {
  activityLabelForPhase,
  activityLabelForTools,
  createActivityPublisher,
  wrapToolsWithActivity,
} from "./activity.js";
import { logAiError } from "./format-ai-error.js";
import { Outline, safeParseOutline, type OutlineT } from "./outline.js";
import { refineOutlineUntilValid } from "./outline-plan.js";
import {
  formatEnrichedPlanIssues,
  outlineValidate,
  OUTLINE_VALIDATE_TOOL_DESCRIPTION,
} from "./outline-validate.js";
import { outlineRevisePrompt, outlineUserPrompt } from "./compose-skill.js";
import { withLayoutMcp } from "./layout-mcp.js";
import type { McpCallLog } from "./slidev-mcp.js";

export const OUTLINE_LAYOUT_SYSTEM = `You plan a Pokazo Slidev deck outline as JSON.

You have MCP tools for layouts:
- layout-list — browse layouts
- layout-get — full contract for one id
- layout-match — ranked candidates for an intent
- outline-validate — plan gate with exact expect contract per failing slide

Rules:
1. Before assigning visual on slides, call layout-list or layout-match (and layout-get for unfamiliar ids).
2. Prefer variety; honor quotas in the user prompt (photos, structured payload, no text-only visuals).
3. For visual=icon|features|process: every iconHint MUST be copied from that layout's iconHints allowlist (layout-get). Never invent Carbon names.
4. Honor fields[].limit from layout-get when filling heading/points/kicker (esp. image-right/image-left: short copy, ≤3 bullets; spotlight: char caps + palette; pie: 3–5 slices + char caps).
5. After drafting the full outline, call outline-validate (outlineJson + slideCount). If ok:false, fix each slide using issues[].expect (outlineFields, antiPatterns, example, iconHints) and call outline-validate again.
6. Only when outline-validate returns ok:true, call submit_outline with the full outline object (title + slides).
7. If submit_outline returns ok:false with issues, fix using expect and re-validate then submit again.
8. Do not invent layout ids outside the catalog.`;

function skipOutlinePlan(): boolean {
  return process.env.SKIP_OUTLINE_PLAN === "1";
}

/** One-line-per-issue summary for server logs (no expect/iconHints noise). */
export function summarizeOutlineIssues(
  issues: Array<{ slide?: number; code?: string; message?: string }>,
  max = 6,
): string {
  if (!issues.length) return "-";
  const parts = issues.slice(0, max).map((i) => {
    const msg = (i.message ?? "").replace(/\s+/g, " ").slice(0, 160);
    return `#${i.slide ?? "?"} ${i.code ?? "issue"}: ${msg}`;
  });
  if (issues.length > max) parts.push(`+${issues.length - max} more`);
  return parts.join(" | ");
}

/** Shared counters so a fallback can say *why* submit_outline never landed. */
export type OutlineAgentTrace = {
  steps: number;
  validateCalls: number;
  validateOk: number;
  lastValidateIssues: string;
  submitCalls: number;
  lastSubmitIssues: string;
  finishReason: string;
  lastText: string;
};

function newTrace(): OutlineAgentTrace {
  return {
    steps: 0,
    validateCalls: 0,
    validateOk: 0,
    lastValidateIssues: "-",
    submitCalls: 0,
    lastSubmitIssues: "-",
    finishReason: "-",
    lastText: "",
  };
}

function formatTrace(t: OutlineAgentTrace): string {
  return (
    `steps=${t.steps} finish=${t.finishReason} ` +
    `validate=${t.validateOk}/${t.validateCalls}ok submit_calls=${t.submitCalls} ` +
    `lastValidateIssues=${t.lastValidateIssues} lastSubmitIssues=${t.lastSubmitIssues}` +
    (t.lastText ? ` lastText=${JSON.stringify(t.lastText.slice(0, 200))}` : "")
  );
}

function recordToolResults(
  trace: OutlineAgentTrace,
  results: Array<{ toolName: string; result?: unknown }>,
): void {
  for (const r of results) {
    if (r.toolName !== "outline-validate" && r.toolName !== "submit_outline") continue;
    const body = unwrapToolResult(r.result);
    const ok = body?.ok === true;
    const issues = Array.isArray(body?.issues)
      ? summarizeOutlineIssues(body.issues as Array<{ slide?: number; code?: string; message?: string }>)
      : typeof body?.issues === "string"
        ? body.issues.slice(0, 300)
        : "-";
    if (r.toolName === "outline-validate") {
      trace.validateCalls += 1;
      if (ok) trace.validateOk += 1;
      else trace.lastValidateIssues = issues;
    } else {
      trace.submitCalls += 1;
      if (!ok) trace.lastSubmitIssues = issues;
    }
    console.info(
      `[outline] ${r.toolName} ok=${ok}${ok ? "" : ` issues=${issues}`}`,
    );
  }
}

/** MCP tools wrap payloads as { content:[{type:"text",text:"<json>"}] }; submit_outline returns plain object. */
function unwrapToolResult(result: unknown): { ok?: boolean; issues?: unknown } | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  if ("ok" in r) return r as { ok?: boolean; issues?: unknown };
  const content = r.content;
  if (Array.isArray(content)) {
    for (const c of content) {
      const text = (c as { text?: unknown })?.text;
      if (typeof text !== "string") continue;
      try {
        const parsed = JSON.parse(text) as { ok?: boolean; issues?: unknown };
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        /* not json */
      }
    }
  }
  return null;
}

export function createSubmitOutlineTool(opts: {
  slideCount: number;
  onAccepted: (outline: OutlineT) => void;
}) {
  return tool({
    description:
      "Submit the final outline JSON after outline-validate returned ok:true. Re-runs the same plan gate; on fail returns structured issues with expect contracts.",
    parameters: Outline,
    execute: async (raw) => {
      if (skipOutlinePlan()) {
        const parsed = safeParseOutline(raw);
        if (!parsed.success) {
          return { ok: false, issues: String(parsed.error) };
        }
        opts.onAccepted(parsed.data);
        return { ok: true, slides: parsed.data.slides.length, title: parsed.data.title };
      }
      const result = outlineValidate(raw, { slideCount: opts.slideCount });
      if (!result.ok) {
        return { ok: false, issues: result.issues };
      }
      opts.onAccepted(result.outline);
      return { ok: true, slides: result.slides, title: result.title };
    },
  });
}

export async function generateOutlineWithLayoutMcp(opts: {
  model: Parameters<typeof generateText>[0]["model"];
  topic: string;
  locale: string;
  audience: string;
  slideCount: number;
  researchMarkdown?: string;
  maxSteps?: number;
  onMcpCall?: (entry: McpCallLog) => void;
  onActivity?: (label: string) => void | Promise<void>;
  reviseModel?: Parameters<typeof generateObject>[0]["model"];
}): Promise<{
  outline: OutlineT;
  via: "submit_outline" | "generateObject_fallback";
  mcpCalls: McpCallLog[];
}> {
  const mcpCalls: McpCallLog[] = [];
  let accepted: OutlineT | null = null;
  const trace = newTrace();
  const maxSteps = opts.maxSteps ?? 24;

  await withLayoutMcp(
    async (layoutTools) => {
      const submit_outline = createSubmitOutlineTool({
        slideCount: opts.slideCount,
        onAccepted: (o) => {
          accepted = o;
        },
      });
      const rawTools = {
        ...layoutTools,
        submit_outline,
      };
      const activity = opts.onActivity
        ? createActivityPublisher({ write: opts.onActivity })
        : null;
      const tools = activity
        ? wrapToolsWithActivity(rawTools, (label) => activity.set(label))
        : rawTools;
      if (activity) await activity.set(activityLabelForPhase("thinking"));
      try {
        await generateText({
          model: opts.model,
          system: OUTLINE_LAYOUT_SYSTEM,
          tools: tools as never,
          maxSteps,
          prompt: outlineUserPrompt({
            topic: opts.topic,
            locale: opts.locale,
            audience: opts.audience,
            slideCount: opts.slideCount,
            researchMarkdown: opts.researchMarkdown,
          }),
          onStepFinish: async (step) => {
            const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
            trace.steps += 1;
            trace.finishReason = String(step.finishReason);
            if (step.text?.trim()) trace.lastText = step.text.trim();
            console.info(
              `[llm] outline step ${trace.steps}/${maxSteps} finish=${step.finishReason} tools=${names.join(",") || "-"}`,
            );
            recordToolResults(
              trace,
              (step.toolResults ?? []) as Array<{ toolName: string; result?: unknown }>,
            );
            if (!activity) return;
            if (names.length) await activity.set(activityLabelForTools(names));
            if (step.finishReason === "tool-calls") void activity.thinkAfterHold();
          },
        });
      } catch (err) {
        console.error(`[outline] agent threw ${formatTrace(trace)}`);
        logAiError("outline", err, { topic: opts.topic, slideCount: opts.slideCount });
        throw err;
      }
    },
    (entry) => {
      mcpCalls.push(entry);
      opts.onMcpCall?.(entry);
    },
  );

  if (accepted) {
    return { outline: accepted, via: "submit_outline", mcpCalls };
  }

  const hitStepCap = trace.steps >= maxSteps;
  console.warn(
    `[generate] outline MCP submit_outline missing — falling back to generateObject ` +
      `reason=${trace.submitCalls === 0 ? "never_called_submit" : "submit_rejected"}${hitStepCap ? " step_cap" : ""} ` +
      formatTrace(trace),
  );
  const first = await generateObject({
    model: opts.reviseModel ?? opts.model,
    schema: Outline,
    prompt: outlineUserPrompt({
      topic: opts.topic,
      locale: opts.locale,
      audience: opts.audience,
      slideCount: opts.slideCount,
      researchMarkdown: opts.researchMarkdown,
    }),
  });
  if (skipOutlinePlan()) {
    return { outline: first.object, via: "generateObject_fallback", mcpCalls };
  }
  const refined = await refineOutlineUntilValid({
    initial: first.object,
    slideCount: opts.slideCount,
    maxAttempts: 3,
    revise: async (current, issues) => {
      console.warn(
        `[outline] fallback revise issues=${summarizeOutlineIssues(issues)}`,
      );
      const revised = await generateObject({
        model: opts.reviseModel ?? opts.model,
        schema: Outline,
        prompt: outlineRevisePrompt({
          topic: opts.topic,
          locale: opts.locale,
          audience: opts.audience,
          slideCount: opts.slideCount,
          previous: current,
          issues: formatEnrichedPlanIssues(current, issues),
          researchMarkdown: opts.researchMarkdown,
        }),
      });
      return revised.object;
    },
  });
  console.info(
    `[outline] fallback done attempts=${refined.attempts} ok=${refined.issues.length === 0}` +
      (refined.issues.length ? ` issues=${summarizeOutlineIssues(refined.issues)}` : ""),
  );
  if (refined.issues.length) {
    console.error(
      `[outline] FAILED after fallback attempts=${refined.attempts} agent: ${formatTrace(trace)} ` +
        `finalIssues=${summarizeOutlineIssues(refined.issues)}`,
    );
    throw new Error(
      `Outline plan failed validation:\n${formatEnrichedPlanIssues(refined.outline, refined.issues)}`,
    );
  }
  return { outline: refined.outline, via: "generateObject_fallback", mcpCalls };
}

/** Re-export for tests / MCP description parity. */
export { OUTLINE_VALIDATE_TOOL_DESCRIPTION };
