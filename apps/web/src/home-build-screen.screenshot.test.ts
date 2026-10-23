import { createServer, type ViteDevServer } from "vite";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import type { Browser, Page } from "playwright-chromium";

const require = createRequire(import.meta.url);
const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = require(
  join(webRoot, "../api/node_modules/playwright-chromium"),
) as typeof import("playwright-chromium");
const deckId = "11111111-1111-4111-8111-111111111111";
/** CI installs the package but not the browser binary. Local runs still shoot the screen. */
const browserReady = existsSync(chromium.executablePath());

let server: ViteDevServer;
let browser: Browser;
let base: string;

async function shot(page: Page, name: string) {
  const path = `/tmp/pokazo-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

beforeAll(async () => {
  if (!browserReady) return;
  server = await createServer({
    configFile: join(webRoot, "vite.config.ts"),
    server: { host: "127.0.0.1", port: 5199, strictPort: true },
    logLevel: "error",
  });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0];
  if (!url) throw new Error("vite did not listen");
  base = url.replace(/\/$/, "");
  browser = await chromium.launch({ headless: true });
}, 30_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

describe.skipIf(!browserReady)("home build screen", () => {
  it("replaces the prompt with the stage, then the player shows Делаю обложку", async () => {
    const page = await browser.newPage({ viewport: { width: 1100, height: 860 } });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    let releaseCreate: () => void = () => {};
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const json = (status: number, body: unknown) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });

      if (path === "/api/auth/me") {
        await json(200, { id: "u1", email: "mail@antonbutov.com", name: "" });
        return;
      }
      if (path === "/api/billing/me") {
        await json(200, {
          credits: 1,
          freeAvailable: true,
          plan: "free",
          planUntil: null,
          paymentsEnabled: false,
          prices: { creditRub: 199, monthRub: 399 },
          label: "Осталось: 1 бесплатная",
        });
        return;
      }
      if (path === "/api/decks" && req.method() === "GET") {
        await json(200, { decks: [] });
        return;
      }
      if (path === "/api/decks" && req.method() === "POST") {
        await createGate;
        await json(201, { deckId });
        return;
      }
      if (path === `/api/decks/${deckId}`) {
        await json(200, {
          deckId,
          status: "generating",
          activity: "Делаю обложку",
          error: null,
          viewUrl: null,
          billingKind: "free",
        });
        return;
      }
      if (path === `/api/view/${deckId}`) {
        await json(404, { error: "not ready" });
        return;
      }
      await json(404, { error: "unmocked" });
    });

    await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Создать" }).waitFor();
    const topicBox = page.getByPlaceholder("Тема новой презентации…");
    expect(await topicBox.count()).toBe(1);

    await topicBox.fill("Италия запоздавшая нация");
    await page.getByRole("button", { name: "Создать" }).click();

    const homeStage = page.locator(".build-stage");
    await homeStage.waitFor();
    expect(await page.getByRole("button", { name: "Создать" }).count()).toBe(0);
    expect(await page.locator(".prompt-card").count()).toBe(0);
    expect(await homeStage.innerText()).toContain("Создаём…");
    expect(await page.locator(".build-phases li.is-now").innerText()).toBe("Тема");
    const homeShot = await shot(page, "home-creating");

    releaseCreate();
    await page.waitForURL(`**/view/${deckId}`);
    const playerStage = page.locator(".build-stage");
    await playerStage.getByText("Делаю обложку").waitFor();
    expect(await playerStage.innerText()).toContain("Делаю обложку");
    expect(await page.locator(".build-phases li.is-now").innerText()).toBe("Обложка");
    expect(await page.getByPlaceholder("Тема новой презентации…").count()).toBe(0);
    expect(await page.getByRole("button", { name: "Делаю обложку" }).count()).toBe(0);
    const anim = await page.locator(".build-card").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(anim).toBe("build-deal");
    const playerShot = await shot(page, "player-cover");

    expect(homeShot).toMatch(/home-creating/);
    expect(playerShot).toMatch(/player-cover/);
    await page.close();
  }, 40_000);
});
