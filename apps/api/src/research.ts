import { generateText } from "ai";
import {
  activityLabelForPhase,
  activityLabelForTools,
  createActivityPublisher,
  wrapToolsWithActivity,
} from "./activity.js";
import {
  RESEARCH_UNAVAILABLE_MARKDOWN,
  researchSystemPrompt,
  researchUserPrompt,
} from "./research-skill.js";
import { createResearchTools, type ResearchSearchFn } from "./research-tools.js";

export type ResearchResult = {
  markdown: string;
  used: boolean;
  searchCalls: number;
  usage?: { promptTokens?: number; completionTokens?: number };
};

type GenerateTextFn = typeof generateText;

export async function runTopicResearch(opts: {
  topic: string;
  locale: string;
  audience: string;
  apiKey: string;
  folderId: string;
  model: unknown;
  maxSteps?: number;
  generateTextFn?: GenerateTextFn;
  search?: ResearchSearchFn;
  onActivity?: (label: string) => void | Promise<void>;
}): Promise<ResearchResult> {
  if (!opts.apiKey || !opts.folderId) {
    console.warn("[research] YANDEX_SEARCH_API_KEY / YANDEX_FOLDER_ID missing — skipping web research");
    return { markdown: RESEARCH_UNAVAILABLE_MARKDOWN, used: false, searchCalls: 0 };
  }

  let searchCalls = 0;
  const rawTools = createResearchTools({
    apiKey: opts.apiKey,
    folderId: opts.folderId,
    search: opts.search,
    onSearch: () => {
      searchCalls += 1;
    },
  });
  const activity = opts.onActivity
    ? createActivityPublisher({ write: opts.onActivity })
    : null;
  const tools = activity ? wrapToolsWithActivity(rawTools, (label) => activity.set(label)) : rawTools;

  const generate = opts.generateTextFn ?? generateText;
  if (activity) await activity.set(activityLabelForPhase("thinking"));
  const result = await generate({
    model: opts.model as never,
    system: researchSystemPrompt(opts.locale),
    tools: tools as never,
    maxSteps: opts.maxSteps ?? 10,
    prompt: researchUserPrompt({
      topic: opts.topic,
      locale: opts.locale,
      audience: opts.audience,
    }),
    onStepFinish: async (step) => {
      if (!activity) return;
      const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
      if (names.length) await activity.set(activityLabelForTools(names));
      if (step.finishReason === "tool-calls") void activity.thinkAfterHold();
    },
  });

  const markdown = (result.text ?? "").trim();
  if (!markdown) {
    throw new Error("Topic research produced empty markdown");
  }

  return {
    markdown,
    used: true,
    searchCalls,
    usage: result.usage
      ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
        }
      : undefined,
  };
}
