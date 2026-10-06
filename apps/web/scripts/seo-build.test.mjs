import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSeoBuild } from "./seo-build.mjs";

const dir = await mkdtemp(join(tmpdir(), "pokazo-seo-"));
try {
  const minimal = `<!doctype html>
<html lang="ru"><head>
<title>t</title>
<meta name="description" content="d" />
</head><body><div id="root"></div></body></html>`;
  await writeFile(join(dir, "index.html"), minimal, "utf8");
  // seo-build reads bodies from apps/web/seo — use real repo paths via default
  // so we only override distDir
  const result = await runSeoBuild(dir);
  const index = await readFile(join(dir, "index.html"), "utf8");
  const shell = await readFile(join(dir, "shell.html"), "utf8");
  const offer = await readFile(join(dir, "legal/offer/index.html"), "utf8");

  const checks = [
    ["landing h1", index.includes("<h1>Нейросеть для презентаций</h1>")],
    ["faq ld", index.includes("FAQPage")],
    ["canonical", index.includes('href="https://pokazo.ru/"')],
    ["shell empty root", /<div id="root"><\/div>/.test(shell)],
    ["shell noindex", shell.includes('content="noindex"')],
    ["offer title", offer.includes("Публичная оферта")],
    ["result ok", result.landingHasH1 && result.hasCanonical && result.hasFaqLd],
  ];
  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length) {
    console.error("seo-build.test failed:", failed.map(([n]) => n));
    process.exit(1);
  }
  console.log("seo-build.test: ok");
} finally {
  await rm(dir, { recursive: true, force: true });
}
