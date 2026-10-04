import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { config } from "./env.js";
import { buildSlidev, writeSlides } from "./slidev.js";
import { guardMarkdown } from "./md-guard.js";

const Outline = z.object({
  title: z.string(),
  slides: z
    .array(
      z.object({
        layout: z.enum([
          "cover",
          "default",
          "center",
          "intro",
          "two-cols",
          "quote",
          "section",
          "end",
        ]),
        heading: z.string(),
        bullets: z.array(z.string()).max(5),
      }),
    )
    .min(4)
    .max(16),
});

function model(id: string) {
  const openai = createOpenAI({
    apiKey: config.openrouterKey,
    baseURL: config.openrouterBaseUrl,
    headers: {
      "HTTP-Referer": config.llmReferer,
      "X-Title": config.llmTitle,
    },
  });
  return openai(id);
}

const SKILL = `You write Slidev markdown.
Rules:
- Separate slides with ---
- First block is YAML headmatter: theme: default, title
- Only layouts: cover, default, center, intro, two-cols, quote, section, end
- two-cols uses ::right::
- No custom Vue SFCs, no <script>
- Russian if locale=ru
- One idea per slide, heading <= 8 words, <= 5 bullets
`;

export async function generateDeck(opts: {
  id: string;
  topic: string;
  locale: string;
  slideCount: number;
  audience: string;
  workDir: string;
}): Promise<void> {
  const outline = await generateObject({
    model: model(config.outlineModel),
    schema: Outline,
    prompt: `Тема: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${opts.audience}
Число слайдов: ${opts.slideCount}
Составь оглавление презентации.`,
  });

  await writeFile(join(opts.workDir, "outline.json"), JSON.stringify(outline.object, null, 2));

  const { text } = await generateText({
    model: model(config.composeModel),
    system: SKILL,
    prompt: `Собери slides.md по этому JSON:\n${JSON.stringify(outline.object)}\nlocale=${opts.locale}`,
  });

  const stripFence = (s: string) => s.replace(/^```(?:md|markdown)?\n?/, "").replace(/\n?```$/, "");
  let md = guardMarkdown(stripFence(text));
  await writeSlides(opts.workDir, md);
  const base = `/p/${opts.id}/`;
  try {
    await buildSlidev(opts.workDir, base);
  } catch (err) {
    const repaired = await generateText({
      model: model(config.composeModel),
      system: SKILL,
      prompt: `Сборка Slidev упала:\n${String(err)}\nИсправь markdown:\n${md}`,
    });
    md = guardMarkdown(stripFence(repaired.text));
    await writeSlides(opts.workDir, md);
    await buildSlidev(opts.workDir, base);
  }
}
