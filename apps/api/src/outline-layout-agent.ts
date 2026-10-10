import { generateObject, generateText, tool } from "ai";
import { Outline, type OutlineT } from "./outline.js";
import {
  formatOutlinePlanIssues,
  refineOutlineUntilValid,
  validateOutlinePlan,
} from "./outline-plan.js";
import { outlineRevisePrompt, outlineUserPrompt } from "./compose-skill.js";
import { withLayoutMcp } from "./layout-mcp.js";
import type { McpCallLog } from "./slidev-mcp.js";

export const OUTLINE_LAYOUT_SYSTEM = `You plan a Pokazo Slidev deck outline as JSON.

You have MCP tools for layouts:
- layout-list — browse layouts
- layout-get — full contract for one id
- layout-match — ranked candidates for an intent

Rules:
1. Before assigning visual on slides, call layout-list or layout-match (and layout-get for unfamiliar ids).
2. Prefer variety; honor quotas in the user prompt (photos, structured payload, no text-only visuals).
3. For visual=icon|features|process: every iconHint MUST be copied from that layout's iconHints allowlist (layout-get). Never invent Carbon names.
4. When ready, call submit_outline with the full outline object (title + slides).
5. If submit_outline returns issues, fix and submit_outline again.
6. Do not invent layout ids outside the catalog.`;

function skipOutlinePlan(): boolean {
  return process.env.SKIP_OUTLINE_PLAN === "1";
}

export function createSubmitOutlineTool(opts: {
  slideCount: number;
  onAccepted: (outline: OutlineT) => void;
}) {
  return tool({
    description:
      "Submit the final outline JSON after consulting layout MCP tools. Validates schema and plan rules.",
    parameters: Outline,
    execute: async (raw) => {
      try {
        const outline = Outline.parse(raw);
        if (!skipOutlinePlan()) {
          const issues = validateOutlinePlan(outline, { slideCount: opts.slideCount });
          if (issues.length) {
            return {
              ok: false,
              issues: formatOutlinePlanIssues(issues),
            };
          }
        }
        opts.onAccepted(outline);
        return { ok: true, slides: outline.slides.length, title: outline.title };
      } catch (err) {
        return { ok: false, issues: String(err) };
      }
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
      await generateText({
        model: opts.model,
        system: OUTLINE_LAYOUT_SYSTEM,
        tools: {
          ...layoutTools,
          submit_outline,
        } as never,
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
          issues: formatOutlinePlanIssues(issues),
          researchMarkdown: opts.researchMarkdown,
        }),
      });
      return revised.object;
    },
  });
  if (refined.issues.length) {
    throw new Error(`Outline plan failed validation:\n${formatOutlinePlanIssues(refined.issues)}`);
  }
  return { outline: refined.outline, via: "generateObject_fallback", mcpCalls };
}
