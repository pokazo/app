import { generateObject, generateText, tool } from "ai";
import {
  activityLabelForPhase,
  activityLabelForTools,
  createActivityPublisher,
  wrapToolsWithActivity,
} from "./activity.js";
import { Outline, type OutlineT } from "./outline.js";
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
        const parsed = Outline.safeParse(raw);
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
      await generateText({
        model: opts.model,
        system: OUTLINE_LAYOUT_SYSTEM,
        tools: tools as never,
        maxSteps: opts.maxSteps ?? 24,
        prompt: outlineUserPrompt({
          topic: opts.topic,
          locale: opts.locale,
          audience: opts.audience,
          slideCount: opts.slideCount,
          researchMarkdown: opts.researchMarkdown,
        }),
        onStepFinish: async (step) => {
          const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
          console.info(`[llm] outline step finish=${step.finishReason} tools=${names.join(",") || "-"}`);
          if (!activity) return;
          if (names.length) await activity.set(activityLabelForTools(names));
          if (step.finishReason === "tool-calls") void activity.thinkAfterHold();
        },
      });
    },
    (entry) => {
      mcpCalls.push(entry);
      opts.onMcpCall?.(entry);
    },
  );

  if (accepted) {
    return { outline: accepted, via: "submit_outline", mcpCalls };
  }

  console.warn("[generate] outline MCP submit_outline missing — falling back to generateObject");
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
  if (refined.issues.length) {
    throw new Error(
      `Outline plan failed validation:\n${formatEnrichedPlanIssues(refined.outline, refined.issues)}`,
    );
  }
  return { outline: refined.outline, via: "generateObject_fallback", mcpCalls };
}

/** Re-export for tests / MCP description parity. */
export { OUTLINE_VALIDATE_TOOL_DESCRIPTION };
