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
- You run AFTER topic research: use the research brief (tone, domain, audience cues) — not the topic line alone.
- Match tone (school → warmer/simpler; business → apple-basic/default; academic → seriph; bold/creative → bricks; dark editorial → ink-dark or brand-auto).
- reason: one short sentence in the user's language.`;
}

export function themePickUserPrompt(opts: {
  topic: string;
  locale: string;
  audience: string;
  /** Research brief produced before theme pick (auto path). */
  researchMarkdown?: string;
}): string {
  const research = (opts.researchMarkdown ?? "").trim();
  const researchBlock = research
    ? `Research brief:\n${research.slice(0, 6000)}`
    : "Research brief: (none)";
  return `Topic: ${opts.topic}
Locale: ${opts.locale}
Audience: ${opts.audience}

${researchBlock}

Pick the best theme id from the allowed list.`;
}
