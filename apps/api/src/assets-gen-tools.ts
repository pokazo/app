import { tool } from "ai";
import { z } from "zod";
import {
  DEFAULT_OPENAI_IMAGE_MODEL,
  generateOpenAiImageToPublic,
  type ImageGenAttribution,
} from "./assets-openai-image.js";

export type GenToolAttribution = ImageGenAttribution & { path: string };

type GenerateFn = (opts: {
  workDir: string;
  prompt: string;
  filename: string;
  apiKey: string;
  model?: string;
  quality?: "low" | "medium" | "high";
  size?: "1024x1024" | "1024x1536" | "1536x1024";
}) => Promise<{ path: string; attribution: ImageGenAttribution; file: string }>;

export function createImageGenTools(
  workDir: string,
  opts: {
    apiKey: string;
    model?: string;
    apiBase?: string;
    generate?: GenerateFn;
    onAttribution?: (entry: GenToolAttribution) => void;
  },
): Record<string, unknown> {
  const configured = Boolean(opts.apiKey);
  const model = opts.model || DEFAULT_OPENAI_IMAGE_MODEL;
  const generate =
    opts.generate ??
    ((args) =>
      generateOpenAiImageToPublic({
        ...args,
        apiBase: opts.apiBase,
        model: args.model ?? model,
        quality: "low",
        size: "1536x1024",
      }));

  return {
    "image-generate": tool({
      description:
        "Generate a subject-true photo with OpenAI (cheap gpt-image-1-mini, low quality) into the deck public/ folder. Use when yandex-image-search and stock-search are empty OR hits are the wrong subject. filename must be a simple basename like slide-3-gen.png. Returns path for Slidev frontmatter image: (e.g. /slide-3-gen.png). Prefer yandex-image-download or stock-download when a hit clearly matches the subject.",
      parameters: z.object({
        prompt: z
          .string()
          .describe(
            "English image prompt naming the exact subject (model/brand/scene). Photorealistic, landscape, no text overlays.",
          ),
        filename: z.string().describe("basename only, e.g. slide-3-gen.png"),
      }),
      execute: async ({ prompt, filename }) => {
        if (!configured) {
          return { error: "OPENAI_API_KEY not configured — skip generate or use non-photo layouts" };
        }
        try {
          const result = await generate({
            workDir,
            prompt,
            filename,
            apiKey: opts.apiKey,
            model,
          });
          const entry: GenToolAttribution = { ...result.attribution, path: result.path };
          opts.onAttribution?.(entry);
          return { path: result.path, attribution: result.attribution };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { error: message };
        }
      },
    }),
  };
}
