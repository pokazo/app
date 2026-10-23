import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runSeoBuild } from "./seo-build.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const home = JSON.parse(await readFile(join(webRoot, "src/home-copy.json"), "utf8"));
const audience = JSON.parse(await readFile(join(webRoot, "src/audience.json"), "utf8"));

const dir = await mkdtemp(join(tmpdir(), "pokazo-seo-"));
try {
  const minimal = `<!doctype html>
<html lang="ru"><head>
<title>t</title>
<meta name="description" content="d" />
</head><body><div id="root"></div></body></html>`;
  await writeFile(join(dir, "index.html"), minimal, "utf8");
  const result = await runSeoBuild(dir);
  const index = await readFile(join(dir, "index.html"), "utf8");
  const shell = await readFile(join(dir, "shell.html"), "utf8");
  const pricing = await readFile(join(dir, "pricing/index.html"), "utf8");
  const offer = await readFile(join(dir, "legal/offer/index.html"), "utf8");
  const urok = await readFile(join(dir, "urok/index.html"), "utf8");
  const biznes = await readFile(join(dir, "biznes/index.html"), "utf8");
  const ld = [...index.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]),
  );
  const faqLd = ld.find((item) => item["@type"] === "FAQPage");
  const faqMatch =
    faqLd.mainEntity.length === home.faq.length &&
    home.faq.every(
      (item, i) =>
        faqLd.mainEntity[i].name === item.q &&
        faqLd.mainEntity[i].acceptedAnswer.text === item.a &&
        index.includes(`<h3>${item.q}</h3>`) &&
        index.includes(item.a),
    );
  const outlines = audience.map((page) => page.outline.join("|"));

  const checks = [
    ["landing h1", index.includes("<h1>Нейросеть для презентаций</h1>")],
    ["faq ld", index.includes("FAQPage")],
    ["canonical", index.includes('href="https://pokazo.ru/"')],
    ["price in landing", index.includes("199") && index.includes("PPTX")],
    ["no stale pptx promise", !index.includes("не обещаем")],
    ["description length", home.description.length <= 180],
    ["aggregate offer", index.includes("AggregateOffer") && index.includes('"highPrice":"399"')],
    ["faq html matches ld", faqMatch],
    ["text faq", index.includes("до 500 символов") && index.includes("Word или PDF")],
    ["shell empty root", /<div id="root"><\/div>/.test(shell)],
    ["shell noindex", shell.includes('content="noindex"')],
    ["pricing h1", pricing.includes("<h1>Тарифы</h1>")],
    ["pricing canonical", pricing.includes('href="https://pokazo.ru/pricing"')],
    ["offer title", offer.includes("Публичная оферта")],
    ["urok h1", urok.includes("<h1>Презентация к уроку</h1>")],
    ["urok canonical", urok.includes('href="https://pokazo.ru/urok"')],
    ["urok not main h1", !urok.includes("<h1>Нейросеть для презентаций</h1>")],
    ["urok faq ld", urok.includes("FAQPage")],
    ["urok outline", urok.includes("Вопрос классу")],
    ["biznes h1", biznes.includes("<h1>Презентация для бизнеса</h1>")],
    ["biznes outline", biznes.includes("Следующий шаг")],
    ["outlines differ", new Set(outlines).size === audience.length],
    ["landing audience links", index.includes('href="/urok"')],
    ["landing contact link", index.includes('href="/contact"')],
    ["contact h1", (await readFile(join(dir, "contact/index.html"), "utf8")).includes("<h1>Контакты</h1>")],
    ["contact canonical", (await readFile(join(dir, "contact/index.html"), "utf8")).includes('href="https://pokazo.ru/contact"')],
    ["result ok", result.landingHasH1 && result.hasCanonical && result.hasFaqLd && result.audienceOk],
  ];
  for (const page of audience) {
    const html = await readFile(join(dir, page.slug, "index.html"), "utf8");
    checks.push([
      `${page.slug} outline`,
      page.outline.every((item) => html.includes(item)) && html.includes(page.outlineTitle),
    ]);
  }
  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length) {
    console.error("seo-build.test failed:", failed.map(([n]) => n));
    process.exit(1);
  }
  console.log("seo-build.test: ok");
} finally {
  await rm(dir, { recursive: true, force: true });
}
