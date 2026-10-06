import { join } from "node:path";
import { generateDeck } from "../src/generate.ts";

async function main() {
  const dir = join(process.cwd(), "../../data/decks/anton-llm");
  await generateDeck({
    id: "anton-llm",
    topic:
      "Личная презентация Антона Бутова: Senior Android Developer, Kotlin, Jetpack Compose, Kotlin Multiplatform, ClearDocs.ai, путь от первых Android-проектов до Senior, цифры GitHub/LinkedIn, стек",
    locale: "ru",
    slideCount: 8,
    audience: "коллеги, заказчики и сообщество разработчиков",
    theme: "default",
    workDir: dir,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
