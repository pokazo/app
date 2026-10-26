#!/usr/bin/env node
/**
 * Post-vite SEO pass:
 * - inject crawler-visible body into index.html
 * - write shell.html (empty #root) for /app|/login|…
 * - write /legal/<doc>/index.html with unique titles
 * - write audience landings from src/audience.json (not hand-written body files)
 * - ensure head has canonical / OG / JSON-LD
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const defaultDist = join(webRoot, "dist");
const seo = join(webRoot, "seo");

const SITE = "https://pokazo.ru";
const INDEXNOW_KEY = "08707910eccd89cc15a79a4bc7d77e88";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function headerHtml() {
  return `<header>
  <a href="/">Показо</a>
  <a href="/login">Войти</a>
</header>`;
}

function footerHtml() {
  return `<footer>
  <p><a href="/pricing">Тарифы</a> · <a href="/contact">Контакты</a> · <a href="/legal/offer">Оферта</a> · <a href="/legal/privacy">Персональные данные</a></p>
  <p>ИП Бутов Антон Сергеевич · ИНН 614302304615 · ОГРНИП 326619600045863</p>
</footer>`;
}

function faqHtml(faq) {
  return faq
    .map((item) => `<h3>${escapeHtml(item.q)}</h3>\n    <p>${escapeHtml(item.a)}</p>`)
    .join("\n    ");
}

function landingBody(home) {
  const leads = home.lead.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n    ");
  const steps = home.steps
    .map((step) => `<li><strong>${escapeHtml(step.title)}</strong> — ${escapeHtml(step.text)}</li>`)
    .join("\n      ");
  const examples = home.examples
    .map(
      (item) =>
        `<article>\n      <h3>${escapeHtml(item.title)}</h3>\n      <p>${escapeHtml(item.text)}</p>\n    </article>`,
    )
    .join("\n    ");
  return `${headerHtml()}
<main>
  <section>
    <h1>${escapeHtml(home.h1)}</h1>
  </section>
  <section>
    <h2>От идеи к показу за три шага</h2>
    <ol>
      ${steps}
    </ol>
  </section>
  <section>
    <h2>Что можно создать</h2>
    ${examples}
  </section>
  <section>
    <h2>Для кого</h2>
    <p>
      <a href="/urok">Урок</a> ·
      <a href="/doklad">Доклад</a> ·
      <a href="/shkola">Школа</a> ·
      <a href="/studenty">Студенты</a> ·
      <a href="/biznes">Бизнес</a>
    </p>
  </section>
  <section>
    <h2>Вопросы</h2>
    ${faqHtml(home.faq)}
    ${leads}
  </section>
</main>
${footerHtml()}`;
}

function audienceBody(page, pages, home) {
  const links = pages
    .map((item) =>
      item.slug === page.slug
        ? escapeHtml(item.chip)
        : `<a href="/${item.slug}">${escapeHtml(item.chip)}</a>`,
    )
    .join(" · ");
  const outline = page.outline.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n      ");
  return `${headerHtml()}
<main>
  <section>
    <h1>${escapeHtml(page.h1)}</h1>
    <p>${escapeHtml(page.lead)}</p>
  </section>
  <section>
    <h2>От темы к показу</h2>
    <ol>
      <li><strong>Тема</strong> — ${escapeHtml(page.stepsNote)}</li>
      <li><strong>ИИ собирает слайды</strong> — нейросеть собирает показ под задачу.</li>
      <li><strong>Смотрите по ссылке</strong> — ${escapeHtml(home.shareStep)}</li>
    </ol>
  </section>
  <section>
    <h2>${escapeHtml(page.outlineTitle)}</h2>
    <p>${escapeHtml(page.scenario)}</p>
    <ol>
      ${outline}
    </ol>
    <p>${escapeHtml(home.offerNote)}</p>
  </section>
  <section>
    <h2>Ещё аудитории</h2>
    <p>${links}</p>
    <p><a href="/">Нейросеть для презентаций</a></p>
  </section>
  <section>
    <h2>Вопросы</h2>
    ${faqHtml(page.faq)}
  </section>
</main>
${footerHtml()}`;
}

function orgJsonLd(home) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Показо",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE,
    description: home.description,
    inLanguage: "ru",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "399",
      priceCurrency: "RUB",
      offerCount: "3",
    },
    publisher: {
      "@type": "Organization",
      name: "Показо",
      url: SITE,
    },
  });
}

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function faqJsonLd(faq) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  });
}

function injectHead(html, { title, description, canonical, jsonLd = [], noindex = false }) {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  if (/<meta\s+name="description"/i.test(out)) {
    out = out.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeAttr(description)}" />`,
    );
  } else {
    out = out.replace(
      "</head>",
      `    <meta name="description" content="${escapeAttr(description)}" />\n  </head>`,
    );
  }

  if (/<link\s+rel="canonical"/i.test(out)) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    );
  }
  if (/property="og:url"/i.test(out)) {
    out = out.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    );
  }
  if (/property="og:title"/i.test(out)) {
    out = out.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escapeAttr(title)}" />`,
    );
  }
  if (/property="og:description"/i.test(out)) {
    out = out.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapeAttr(description)}" />`,
    );
  }

  const extras = [];
  if (noindex && !/name="robots"/i.test(out)) {
    extras.push(`<meta name="robots" content="noindex" />`);
  }
  if (!/<link\s+rel="canonical"/i.test(out)) {
    extras.push(
      `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:locale" content="ru_RU" />`,
      `<meta property="og:site_name" content="Показо" />`,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
      `<meta property="og:title" content="${escapeAttr(title)}" />`,
      `<meta property="og:description" content="${escapeAttr(description)}" />`,
    );
  }
  for (const obj of jsonLd) {
    if (!out.includes(obj.slice(0, 40))) {
      extras.push(`<script type="application/ld+json">${obj}</script>`);
    }
  }
  if (extras.length) {
    out = out.replace("</head>", `    ${extras.join("\n    ")}\n  </head>`);
  }
  return out;
}

/** Runs in <head> before #prerender is parsed, so a refresh does not paint crawler HTML. */
const PRERENDER_BOOT = `<script>document.documentElement.classList.add("js")</script>
    <style>html.js #prerender{display:none !important}</style>`;

function injectRoot(html, bodyInner) {
  if (!/<div id="root"><\/div>/.test(html)) {
    throw new Error('seo-build: expected empty <div id="root"></div>');
  }
  let out = html;
  if (!out.includes('document.documentElement.classList.add("js")')) {
    out = out.replace("</head>", `    ${PRERENDER_BOOT}\n  </head>`);
  }
  return out.replace(
    /<div id="root"><\/div>/,
    `<div id="root"><div id="prerender">${bodyInner.trim()}</div></div>`,
  );
}

async function writePrerender(distDir, { dirParts, title, description, body, bodyFile, jsonLd = [] }) {
  const template = await readFile(join(distDir, "shell.html"), "utf8");
  const inner = body ?? (await readFile(join(seo, bodyFile), "utf8"));
  const pathSeg = dirParts.join("/");
  const canonical = `${SITE}/${pathSeg}`;
  let html = template.replace(/\s*<meta name="robots" content="noindex"\s*\/?>/, "");
  html = injectHead(html, { title, description, canonical, jsonLd });
  html = injectRoot(html, inner);
  const dir = join(distDir, ...dirParts);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), html, "utf8");
  return html;
}

export async function runSeoBuild(distDir = defaultDist) {
  const home = JSON.parse(await readFile(join(webRoot, "src/home-copy.json"), "utf8"));
  const indexPath = join(distDir, "index.html");
  let indexHtml = await readFile(indexPath, "utf8");

  const shellHtml = injectHead(indexHtml, {
    title: "Показо",
    description: home.description,
    canonical: `${SITE}/`,
    noindex: true,
  });
  await writeFile(join(distDir, "shell.html"), shellHtml, "utf8");

  indexHtml = injectHead(indexHtml, {
    title: home.title,
    description: home.description,
    canonical: `${SITE}/`,
    jsonLd: [orgJsonLd(home), faqJsonLd(home.faq)],
  });
  indexHtml = injectRoot(indexHtml, landingBody(home));
  await writeFile(indexPath, indexHtml, "utf8");

  await writePrerender(distDir, {
    dirParts: ["contact"],
    title: "Контакты — Показо",
    description:
      "Напишите в Показо: вопрос, ошибка или претензия. Ответим на указанную почту.",
    bodyFile: "contact-body.html",
  });

  await writePrerender(distDir, {
    dirParts: ["pricing"],
    title: "Тарифы и цены — Показо",
    description:
      "Сколько стоит нейросеть для презентаций Показо: одна колода бесплатно, разовая генерация и безлимит на месяц.",
    bodyFile: "pricing-body.html",
  });

  await writePrerender(distDir, {
    dirParts: ["legal", "offer"],
    title: "Публичная оферта — Показо",
    description: "Публичная оферта сервиса Показо для создания презентаций онлайн.",
    bodyFile: "offer-body.html",
  });
  await writePrerender(distDir, {
    dirParts: ["legal", "privacy"],
    title: "Политика персональных данных — Показо",
    description: "Политика обработки персональных данных сервиса Показо.",
    bodyFile: "privacy-body.html",
  });

  const audience = JSON.parse(await readFile(join(webRoot, "src/audience.json"), "utf8"));
  const audienceResults = [];
  for (const page of audience) {
    const html = await writePrerender(distDir, {
      dirParts: [page.slug],
      title: page.title,
      description: page.description,
      body: audienceBody(page, audience, home),
      jsonLd: [faqJsonLd(page.faq)],
    });
    audienceResults.push({
      slug: page.slug,
      hasH1: html.includes(`<h1>${page.h1}</h1>`),
      hasCanonical: html.includes(`href="${SITE}/${page.slug}"`),
      notMainH1: !html.includes("<h1>Нейросеть для презентаций</h1>"),
      hasOutline: page.outline.every((item) => html.includes(escapeHtml(item))),
    });
  }

  await writeFile(
    join(distDir, "indexnow-key.json"),
    JSON.stringify({ key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt` }, null, 2),
    "utf8",
  );

  return {
    landingHasH1: indexHtml.includes("<h1>Нейросеть для презентаций</h1>"),
    hasCanonical: indexHtml.includes('rel="canonical"'),
    hasFaqLd: indexHtml.includes("FAQPage"),
    audienceOk: audienceResults.every((r) => r.hasH1 && r.hasCanonical && r.notMainH1 && r.hasOutline),
    audienceResults,
  };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const result = await runSeoBuild();
  if (!result.landingHasH1 || !result.hasCanonical || !result.hasFaqLd || !result.audienceOk) {
    console.error("seo-build: sanity check failed", result);
    process.exit(1);
  }
  console.log("seo-build: ok", result);
}
