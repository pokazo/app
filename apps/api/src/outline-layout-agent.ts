import { generateObject, generateText, tool } from "ai";
import {
  outlineGenerateObjectSchema,
  toolJsonSchemaForProvider,
} from "./gemini-json-schema.js";
import {
  activityLabelForPhase,
  activityLabelForTools,
  createActivityPublisher,
  wrapToolsWithActivity,
} from "./activity.js";
import { logAiError } from "./format-ai-error.js";
import { Outline, safeParseOutline, type OutlineT } from "./outline.js";
import {
  demoteUnfilledSlides,
  refineOutlineUntilValid,
  validateOutlinePlan,
} from "./outline-plan.js";
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
1. Before assigning visual on slides, call layout-list or layout-match (and layout-get for unfamiliar ids). Both return limits (H1, kicker, …) — read them before picking a visual.
2. Prefer variety; honor quotas in the user prompt (photos, structured payload, no text-only visuals).
3. For visual=icon|features|process: every iconHint MUST be copied from that layout's iconHints allowlist (layout-get). Never invent Carbon names.
4. Choose a visual only when heading/points fit that layout's limits.H1 (and other limits). If the idea needs a long thesis title, pick another layout (two-cols, cards, …) or shorten the heading — never assign statement/fact/quote with an overlong H1 (overflow clips).
5. Honor limits from layout-list/match and fields[].limit from layout-get when filling heading/points/kicker (esp. image-right/image-left: short copy, ≤3 bullets; statement: H1 ≈3–10 words; spotlight: char caps + palette; pie: 3–5 slices + char caps; agenda: 3–5 titles + palette).
6. After drafting the full outline, call outline-validate (outlineJson + slideCount). If ok:false, fix each slide using issues[].expect (outlineFields, antiPatterns, example, limits, iconHints) and call outline-validate again.
7. Only when outline-validate returns ok:true, call submit_outline with the full outline object (title + slides).
8. If submit_outline returns ok:false with issues, fix using expect and re-validate then submit again.
9. Do not invent layout ids outside the catalog.`;

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

/**
 * Same JSON schema the model sees (guidance unchanged), but NO SDK-side validation.
 * With a zod `parameters`, a schema miss makes generateText throw
 * `InvalidToolArgumentsError` and kills the whole run (seen with gemini-2.5-flash).
 * Instead execute() validates and returns `{ ok:false, issues }` so the model can fix it.
 */
/** First pass + one retry turn when the agent stops without an accepted submit_outline. */
const AGENT_ROUNDS = 2;
const MAX_DRAFT_CHARS = 14_000;

/** Prompt tail for the retry round: last issues + last draft, so the model fixes instead of restarting. */
export function outlineRetryFeedback(trace: OutlineAgentTrace, lastDraft: string): string {
  const issues =
    trace.lastSubmitIssues !== "-" ? trace.lastSubmitIssues : trace.lastValidateIssues;
  return [
    "ПОВТОР: прошлая попытка закончилась без принятого submit_outline.",
    issues !== "-" ? `Последние ошибки: ${issues}` : "",
    lastDraft ? `Последний черновик outline (JSON, исправь его, не начинай с нуля):\n${lastDraft}` : "",
    "Для каждого слайда с visual=features|process|timeline|stats|cards|spotlight|pie|agenda заполни payload полностью (features — ровно 3 items, process — 3–5 steps, iconHint только из allowlist; agenda — palette + 3–5 cards title-only). Если контента на такую раскладку нет — смени visual на image-right|image-left с points.",
    "Сначала outline-validate, затем submit_outline. Не пиши JSON в обычном ответе — только вызовом инструмента.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function createSubmitOutlineTool(opts: {
  slideCount: number;
  outlineModelId: string;
  onAccepted: (outline: OutlineT) => void;
  /** Raw draft of every submit attempt (for the retry round). */
  onAttempt?: (raw: unknown) => void;
}) {
  return tool({
    description:
      "Submit the final outline JSON after outline-validate returned ok:true. Re-runs the same plan gate; on fail returns structured issues with expect contracts.",
    parameters: toolJsonSchemaForProvider(Outline, opts.outlineModelId),
    execute: async (raw: unknown) => {
      opts.onAttempt?.(raw);
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
  /** OpenRouter model id (e.g. google/gemini-3.6-flash) — selects structured-output JSON Schema shape. */
  outlineModelId: string;
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
  let lastDraft = "";
  let agentError: unknown = null;

  await withLayoutMcp(
    async (layoutTools) => {
      const submit_outline = createSubmitOutlineTool({
        slideCount: opts.slideCount,
        outlineModelId: opts.outlineModelId,
        onAccepted: (o) => {
          accepted = o;
        },
        onAttempt: (raw) => {
          try {
            lastDraft = JSON.stringify(raw).slice(0, MAX_DRAFT_CHARS);
          } catch {
            /* ignore unserializable draft */
          }
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

      const basePrompt = outlineUserPrompt({
        topic: opts.topic,
        locale: opts.locale,
        audience: opts.audience,
        slideCount: opts.slideCount,
        researchMarkdown: opts.researchMarkdown,
      });

      for (let round = 1; round <= AGENT_ROUNDS && !accepted; round += 1) {
        const prompt =
          round === 1
            ? basePrompt
            : `${basePrompt}\n\n${outlineRetryFeedback(trace, lastDraft)}`;
        if (round > 1) {
          console.warn(
            `[outline] agent round ${round}/${AGENT_ROUNDS} — no accepted submit yet; ${formatTrace(trace)}`,
          );
        }
        try {
          await generateText({
            model: opts.model,
            system: OUTLINE_LAYOUT_SYSTEM,
            tools: tools as never,
            maxSteps,
            prompt,
            onStepFinish: async (step) => {
              const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
              trace.steps += 1;
              trace.finishReason = String(step.finishReason);
              if (step.text?.trim()) trace.lastText = step.text.trim();
              console.info(
                `[llm] outline step ${trace.steps} (round ${round}) finish=${step.finishReason} tools=${names.join(",") || "-"}`,
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
          // Do not abort the deck: fall through to generateObject + demotion below.
          agentError = err;
          console.error(`[outline] agent round ${round} threw ${formatTrace(trace)}`);
          logAiError("outline", err, { topic: opts.topic, slideCount: opts.slideCount });
          break;
        }
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
      `reason=${agentError ? "agent_error" : trace.submitCalls === 0 ? "never_called_submit" : "submit_rejected"}${hitStepCap ? " step_cap" : ""} ` +
      formatTrace(trace),
  );
  const outlineSchema = outlineGenerateObjectSchema(opts.outlineModelId);
  const first = await generateObject({
    model: opts.reviseModel ?? opts.model,
    schema: outlineSchema,
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
        schema: outlineSchema,
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
    // Last resort: unfilled features/process/… slides become plain image-right bullets.
    const rescued = demoteUnfilledSlides(refined.outline);
    if (rescued.demoted.length) {
      const after = validateOutlinePlan(rescued.outline, { slideCount: opts.slideCount });
      console.warn(
        `[outline] demoted unfilled slides ${rescued.demoted
          .map((d) => `#${d.slide}:${d.from}→image-right`)
          .join(",")} remainingIssues=${summarizeOutlineIssues(after)}`,
      );
      if (!after.length) {
        return { outline: rescued.outline, via: "generateObject_fallback", mcpCalls };
      }
    }
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
