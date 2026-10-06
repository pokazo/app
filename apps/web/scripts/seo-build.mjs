#!/usr/bin/env node
/**
 * Post-vite SEO pass:
 * - inject crawler-visible body into index.html
 * - write shell.html (empty #root) for /app|/login|…
 * - write /legal/<doc>/index.html with unique titles
 * - ensure head has canonical / OG / JSON-LD on landing
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

const LANDING_TITLE = "Нейросеть для презентаций — Показо";
const LANDING_DESC =
  "Создайте презентацию по теме онлайн. Русский язык, без VPN. Показ по ссылке в браузере.";

const ORG_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Показо",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE,
  description: LANDING_DESC,
  inLanguage: "ru",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "RUB",
    description: "Тестовый доступ до запуска оплаты",
  },
  publisher: {
    "@type": "Organization",
    name: "Показо",
    url: SITE,
  },
});

const FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Нужен ли VPN?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Нет. Показо работает в России на русском языке, без VPN и зарубежных аккаунтов.",
      },
    },
    {
      "@type": "Question",
      name: "Можно без PowerPoint?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да. Презентация открывается в браузере по ссылке — коллегам и ученикам файл не нужен.",
      },
    },
    {
      "@type": "Question",
      name: "Когда файл PPTX?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Экспорт в PPTX пока не обещаем в MVP. Сейчас фокус на онлайн-показе по ссылке.",
      },
    },
    {
      "@type": "Question",
      name: "На каком языке слайды?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "На русском: тема, структура и тексты слайдов под российскую школу, вуз и работу.",
      },
    },
  ],
});

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
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

function injectRoot(html, bodyInner) {
  if (!/<div id="root"><\/div>/.test(html)) {
    throw new Error('seo-build: expected empty <div id="root"></div>');
  }
  return html.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${bodyInner.trim()}</div>`,
  );
}

async function writeLegal(distDir, { pathSeg, title, description, bodyFile }) {
  const template = await readFile(join(distDir, "shell.html"), "utf8");
  const body = await readFile(join(seo, bodyFile), "utf8");
  const canonical = `${SITE}/legal/${pathSeg}`;
  // shell has noindex — strip it for legal pages
  let html = template.replace(/\s*<meta name="robots" content="noindex"\s*\/?>/, "");
  html = injectHead(html, { title, description, canonical });
  html = injectRoot(html, body);
  const dir = join(distDir, "legal", pathSeg);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), html, "utf8");
}

export async function runSeoBuild(distDir = defaultDist) {
  const indexPath = join(distDir, "index.html");
  let indexHtml = await readFile(indexPath, "utf8");

  const shellHtml = injectHead(indexHtml, {
    title: "Показо",
    description: LANDING_DESC,
    canonical: `${SITE}/`,
    noindex: true,
  });
  await writeFile(join(distDir, "shell.html"), shellHtml, "utf8");

  const landingBody = await readFile(join(seo, "landing-body.html"), "utf8");
  indexHtml = injectHead(indexHtml, {
    title: LANDING_TITLE,
    description: LANDING_DESC,
    canonical: `${SITE}/`,
    jsonLd: [ORG_JSON_LD, FAQ_JSON_LD],
  });
  indexHtml = injectRoot(indexHtml, landingBody);
  await writeFile(indexPath, indexHtml, "utf8");

  await writeLegal(distDir, {
    pathSeg: "offer",
    title: "Публичная оферта — Показо",
    description: "Публичная оферта сервиса Показо для создания презентаций онлайн.",
    bodyFile: "offer-body.html",
  });
  await writeLegal(distDir, {
    pathSeg: "privacy",
    title: "Политика персональных данных — Показо",
    description: "Политика обработки персональных данных сервиса Показо.",
    bodyFile: "privacy-body.html",
  });

  await writeFile(
    join(distDir, "indexnow-key.json"),
    JSON.stringify({ key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt` }, null, 2),
    "utf8",
  );

  return {
    landingHasH1: indexHtml.includes("<h1>Нейросеть для презентаций</h1>"),
    hasCanonical: indexHtml.includes('rel="canonical"'),
    hasFaqLd: indexHtml.includes("FAQPage"),
  };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const result = await runSeoBuild();
  if (!result.landingHasH1 || !result.hasCanonical || !result.hasFaqLd) {
    console.error("seo-build: sanity check failed", result);
    process.exit(1);
  }
  console.log("seo-build: ok", result);
}
