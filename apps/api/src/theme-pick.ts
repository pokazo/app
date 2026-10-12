import { z } from "zod";
import {
  SELECTABLE_THEME_IDS,
  sanitizePickerTheme,
  type SelectableThemeId,
} from "./themes.js";
import { themePickSystemPrompt, themePickUserPrompt } from "./theme-pick-skill.js";

export const ThemePick = z.object({
  theme: z.enum(SELECTABLE_THEME_IDS),
  reason: z.string().min(1).max(280),
});

export type ThemePickT = z.infer<typeof ThemePick>;

export type ThemePickResult = {
  theme: SelectableThemeId;
  reason: string;
  via: "llm" | "passthrough" | "fallback";
};

type GenerateObjectFn = (args: {
  model: unknown;
  schema: typeof ThemePick;
  system: string;
  prompt: string;
}) => Promise<{ object: unknown }>;

export async function resolveDeckTheme(opts: {
  requested: string;
  topic: string;
  locale: string;
  audience: string;
  /** AI SDK model — required when requested is "auto" and no generateObjectFn. */
  model?: unknown;
  generateObjectFn?: GenerateObjectFn;
}): Promise<ThemePickResult> {
  const requested = sanitizePickerTheme(opts.requested);
  if (requested !== "auto") {
    return {
      theme: requested,
      reason: "user-selected",
      via: "passthrough",
    };
  }

  const system = themePickSystemPrompt();
  const prompt = themePickUserPrompt({
    topic: opts.topic,
    locale: opts.locale,
    audience: opts.audience,
  });

  try {
    let object: unknown;
    if (opts.generateObjectFn) {
      const result = await opts.generateObjectFn({
        model: opts.model ?? null,
        schema: ThemePick,
        system,
        prompt,
      });
      object = result.object;
    } else {
      const { generateObject } = await import("ai");
      if (opts.model == null) {
        throw new Error("theme-pick requires model when auto");
      }
      const result = await generateObject({
        model: opts.model as never,
        schema: ThemePick,
        system,
        prompt,
      });
      object = result.object;
    }

    const parsed = ThemePick.parse(object);
    return { theme: parsed.theme, reason: parsed.reason, via: "llm" };
  } catch (err) {
    console.warn(`[theme-pick] LLM failed, falling back to default: ${String(err)}`);
    return {
      theme: "default",
      reason: "fallback after pick error",
      via: "fallback",
    };
  }
}
