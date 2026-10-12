/** Landing path slugs and legacy audience codes stored on deck.audience. */
export const AUDIENCE_IDS = [
  "urok",
  "doklad",
  "shkola",
  "studenty",
  "biznes",
  "school",
  "business",
  "investors",
] as const;

export type AudienceId = (typeof AUDIENCE_IDS)[number];

const AUDIENCE_SET = new Set<string>(AUDIENCE_IDS);

/** Normalize create/API audience; unknown → school. */
export function sanitizeAudience(raw: string | null | undefined): AudienceId {
  const id = (raw ?? "").trim().toLowerCase();
  return AUDIENCE_SET.has(id) ? (id as AudienceId) : "school";
}

/**
 * Expand landing path / legacy code into prompt guidance.
 * Stored value stays short (shkola); model sees where the person came from.
 */
export function audienceForPrompt(raw: string): string {
  const id = sanitizeAudience(raw);
  const labels: Record<AudienceId, string> = {
    urok: "урок (/urok): презентация к школьному уроку; цели урока, возрастной уровень класса, ясный учебный язык",
    doklad:
      "доклад (/doklad): учебный доклад; структура выступления, тезис → аргументы → вывод",
    shkola: "школа (/shkola): школьная аудитория; простой язык, возраст/класс если указан",
    studenty:
      "студенты (/studenty): семинар, курсовая, защита; академичный тон без воды",
    biznes: "бизнес (/biznes): питч и рабочие встречи; одна идея на слайд, следующий шаг",
    school: "школа: школьная аудитория; простой язык, возраст/класс если указан",
    business: "бизнес: питч и рабочие встречи; одна идея на слайд, следующий шаг",
    investors: "инвесторы: питч, проблема → решение → метрики → следующий шаг",
  };
  return labels[id];
}
