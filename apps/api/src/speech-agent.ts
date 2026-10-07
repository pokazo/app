import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import {
  SPEECH_JSON,
  SpeechDoc,
  speechSystemPrompt,
  speechUserPrompt,
  type SpeechDocT,
} from "./speech.js";

export type GenerateSpeechOpts = {
  workDir: string;
  outline: { title: string; slides: Array<{ heading: string }> };
  locale: string;
  slidesMd: string;
  /** Injectable for tests — skips OpenRouter client entirely. */
  generateObjectFn?: (args: {
    model: unknown;
    schema: typeof SpeechDoc;
    system: string;
    prompt: string;
  }) => Promise<{ object: unknown }>;
  modelId?: string;
};

export async function generateSpeechForDeck(opts: GenerateSpeechOpts): Promise<SpeechDocT> {
  const prompt = speechUserPrompt({
    title: opts.outline.title,
    locale: opts.locale,
    outlineJson: JSON.stringify(opts.outline, null, 2),
    slidesMd: opts.slidesMd,
  });
  const system = speechSystemPrompt();

  let object: unknown;
  if (opts.generateObjectFn) {
    const result = await opts.generateObjectFn({
      model: null,
      schema: SpeechDoc,
      system,
      prompt,
    });
    object = result.object;
  } else {
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { generateObject } = await import("ai");
    const { config } = await import("./env.js");
    const openai = createOpenAI({
      apiKey: config.openrouterKey,
      baseURL: config.openrouterBaseUrl,
      headers: {
        "HTTP-Referer": config.llmReferer,
        "X-Title": config.llmTitle,
      },
    });
    const modelId = opts.modelId ?? config.composeModel;
    const result = await generateObject({
      model: openai(modelId),
      schema: SpeechDoc,
      system,
      prompt,
    });
    object = result.object;
  }

  const doc = SpeechDoc.parse(object);
  await writeFile(join(opts.workDir, SPEECH_JSON), JSON.stringify(doc, null, 2), "utf8");
  return doc;
}
