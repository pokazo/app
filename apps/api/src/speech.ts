import { z } from "zod";

export const SPEECH_JSON = "speech.json";

const nonEmpty = z.string().trim().min(1);

export const SpeechSlide = z.object({
  index: z.number().int().positive(),
  heading: z.string(),
  theses: nonEmpty,
  speech: nonEmpty,
});

export const SpeechDoc = z.object({
  slides: z.array(SpeechSlide).min(1),
});

export type SpeechSlideT = z.infer<typeof SpeechSlide>;
export type SpeechDocT = z.infer<typeof SpeechDoc>;

export function parseSpeechJson(raw: string): SpeechDocT {
  return SpeechDoc.parse(JSON.parse(raw));
}

export function notesTextForSlide(slide: { theses: string; speech: string }): string {
  return `${slide.theses.trim()}\n\n${slide.speech.trim()}`;
}

export function speechUserPrompt(opts: {
  title: string;
  locale: string;
  outlineJson: string;
  slidesMd: string;
}): string {
  return [
    `Напиши спич докладчика для презентации «${opts.title}».`,
    `Язык: ${opts.locale === "en" ? "English" : "русский"}.`,
    `На каждый слайд из outline:`,
    `- theses: шпаргалка, по одной короткой строке на тезис (\\n между строками);`,
    `- speech: полный устный текст, связная речь, не копипаст буллетов слайда;`,
    `- index: 1-based по порядку outline;`,
    `- heading: заголовок слайда из outline.`,
    `Число слайдов в ответе = число слайдов в outline.`,
    ``,
    `Outline JSON:`,
    opts.outlineJson,
    ``,
    `slides.md (справочно):`,
    opts.slidesMd.slice(0, 12000),
  ].join("\n");
}

export function speechSystemPrompt(): string {
  return [
    "Ты помощник докладчика Pokazo.",
    "Пишешь тезисы (шпаргалка) и полный устный спич по слайдам.",
    "Тезисы короткие; спич — как говорят вслух, без markdown-разметки.",
    "Ответ строго по схеме JSON.",
  ].join(" ");
}
