import { THEME_PICK_CATALOG } from "./themes.js";

export function themePickSystemPrompt(): string {
  const catalog = THEME_PICK_CATALOG.map(
    (t) => `- ${t.id}: ${t.title} — ${t.hint}`,
  ).join("\n");
  return `You pick ONE presentation theme for a Slidev deck.

Return JSON only: { "theme": "<id>", "reason": "<short>" }.

Allowed theme ids (exactly one):
${catalog}

Rules:
- Choose from the list above only — never invent ids, never return "auto".
- Match tone of topic + audience (school → warmer/simpler; business → apple-basic/default; academic → seriph; bold/creative → bricks; dark editorial → ink-dark or brand-auto).
- reason: one short sentence in the user's language.`;
}

export function themePickUserPrompt(opts: {
  topic: string;
  locale: string;
  audience: string;
}): string {
  return `Topic: ${opts.topic}
Locale: ${opts.locale}
Audience: ${opts.audience}

Pick the best theme id.`;
}
