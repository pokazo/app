import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./env.js";
import { pool } from "./migrate.js";
import { createAuth } from "./auth.js";
import { deckBusyForRewrite, enqueueDeck, enqueueRewriteSlide } from "./queue.js";
import { isSafePath } from "./md-guard.js";
import { toDeckDto, type DeckRow } from "./deck-dto.js";
import { outlineTitle, slidesForView, slidesFromOutline } from "./view-meta.js";
import { injectPlayerChromeHide, deckAssetCacheControl, deckAssetContentType } from "./player-chrome.js";
import { sanitizePickerTheme } from "./themes.js";
import {
  contentDisposition,
  downloadBasename,
  ensureDeckExport,
  isExportFormat,
} from "./deck-export.js";
import { isSpeechMissingResult, readSpeechResponse, writeSpeechDoc } from "./speech-http.js";
import { isRewriteBuilding, readRewriteStatus, writeRewriteStatus } from "./rewrite-status.js";
import { readPreviewBuild } from "./progressive-preview.js";
import { appendDeckUploads, persistDeckUploads } from "./upload-store.js";
import {
  applyPaidPayment,
  getBillingMe,
  reserveGenerate,
  type BillingProduct,
} from "./billing.js";
import {
  getTochkaClient,
  isTochkaPaidStatus,
  parseTochkaWebhook,
} from "./tochka.js";

const DECK_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DeckCreateFields = {
  topic?: string;
  locale?: string;
  slideCount?: number;
  audience?: string;
  theme?: string;
};

function asFileList(value: unknown): Array<{ name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> }> {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter(
    (f): f is File =>
      typeof f === "object" &&
      f != null &&
      typeof (f as File).arrayBuffer === "function" &&
      typeof (f as File).name === "string",
  );
}

async function parseDeckCreateRequest(c: {
  req: {
    header: (name: string) => string | undefined;
    json: <T>() => Promise<T>;
    parseBody: (opts?: { all?: boolean }) => Promise<Record<string, unknown>>;
  };
}): Promise<{ fields: DeckCreateFields; files: ReturnType<typeof asFileList> }> {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody({ all: true });
    const files = [
      ...asFileList(body.files),
      ...asFileList(body.file),
      ...asFileList(body["files[]"]),
    ];
    return {
      fields: {
        topic: typeof body.topic === "string" ? body.topic : undefined,
        locale: typeof body.locale === "string" ? body.locale : undefined,
        slideCount: body.slideCount != null ? Number(body.slideCount) : undefined,
        audience: typeof body.audience === "string" ? body.audience : undefined,
        theme: typeof body.theme === "string" ? body.theme : undefined,
      },
      files,
    };
  }
  const body = await c.req.json<DeckCreateFields>();
  return { fields: body, files: [] };
}

export function createApp() {
  const app = new Hono();
  const auth = createAuth();

  app.use(
    "*",
    cors({
      origin: [config.appOrigin, "https://pokazo.ru", "https://www.pokazo.ru", "http://localhost:5173"],
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/auth/me", async (c) => {
    if (!auth) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "unauthorized" }, 401);
    return c.json({ id: session.user.id, email: session.user.email, name: session.user.name });
  });

  app.get("/api/auth/next-check", (c) => c.json({ next: isSafePath(c.req.query("next") ?? null) }));

  if (auth) {
    app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
  }

  app.get("/api/billing/me", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "unauthorized" }, 401);
    return c.json(await getBillingMe(session.user.id));
  });

  app.post("/api/billing/checkout", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<{ product?: string }>();
    if (body.product !== "credit_1" && body.product !== "month_30") {
      return c.json({ error: "bad product" }, 400);
    }

    const product: BillingProduct = body.product;
    const paymentId = randomUUID();
    const amountKopecks =
      product === "credit_1" ? config.priceCreditKopecks : config.priceMonthKopecks;
    await pool.query(
      `INSERT INTO payment (id, user_id, product, amount_kopecks, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [paymentId, session.user.id, product, amountKopecks],
    );

    const successRedirectUrl = `${config.publicBaseUrl}/app?paid=1`;
    if (config.billingFreeUnlock) {
      const operationId = `free-${paymentId}`;
      await applyPaidPayment(paymentId, operationId);
      await pool.query(
        `UPDATE payment SET payment_url=$2 WHERE id=$1`,
        [paymentId, successRedirectUrl],
      );
      return c.json({ paymentId, paymentUrl: successRedirectUrl, amountKopecks });
    }

    const payment = await getTochkaClient().createPaymentLink({
      amountKopecks,
      purpose:
        product === "credit_1"
          ? "Одна презентация в Показо"
          : "Безлимит Показо на 30 дней",
      paymentId,
      successRedirectUrl,
      failRedirectUrl: `${config.publicBaseUrl}/app?paid=0`,
    });
    await pool.query(
      `UPDATE payment
          SET payment_url=$2, tochka_operation_id=$3
        WHERE id=$1`,
      [paymentId, payment.paymentUrl, payment.operationId],
    );
    return c.json({
      paymentId,
      paymentUrl: payment.paymentUrl,
      amountKopecks,
    });
  });

  app.post("/api/payments/tochka/webhook", async (c) => {
    const event = await parseTochkaWebhook(await c.req.text());
    if (!event) return c.json({ error: "bad webhook" }, 400);
    if (!pool || !isTochkaPaidStatus(event.status)) return c.json({ ok: true });

    try {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id
           FROM payment
          WHERE ($1::text IS NOT NULL AND tochka_operation_id=$1)
             OR ($2::text IS NOT NULL AND id=$2)
          LIMIT 1`,
        [event.operationId, event.paymentLinkId],
      );
      const paymentId = rows[0]?.id;
      if (paymentId) {
        await applyPaidPayment(
          paymentId,
          event.operationId ?? `payment-link-${event.paymentLinkId ?? paymentId}`,
        );
      }
    } catch (error) {
      console.error("[billing] Tochka webhook", error);
    }
    return c.json({ ok: true });
  });

  app.post("/api/decks", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const { fields, files } = await parseDeckCreateRequest(c);
    const topic = (fields.topic ?? "").trim();
    if (topic.length < 5 || topic.length > 500) return c.json({ error: "bad topic" }, 400);
    const slideCount = Math.min(16, Math.max(3, Number(fields.slideCount ?? 8)));
    const id = randomUUID();
    await pool.query(
      `INSERT INTO deck (id, user_id, topic, locale, slide_count, audience, theme, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'queued')`,
      [
        id,
        session.user.id,
        topic,
        fields.locale ?? "ru",
        slideCount,
        fields.audience ?? "school",
        sanitizePickerTheme(fields.theme),
      ],
    );
    const reserved = await reserveGenerate(session.user.id, id);
    if (!reserved.ok) {
      await pool.query(`DELETE FROM deck WHERE id=$1`, [id]);
      const billing = await getBillingMe(session.user.id);
      return c.json({ error: "payment_required", billing }, 402);
    }
    if (files.length > 0) {
      const manifest = await persistDeckUploads({
        uploadRoot: config.uploadDataDir,
        deckId: id,
        files,
      });
      console.info(`[api] deck ${id} uploads=${manifest.files.length}`);
    }
    await enqueueDeck(id);
    return c.json({ deckId: id, status: "queued" }, 201);
  });

  app.get("/api/decks", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const { rows } = await pool.query<DeckRow>(
      `SELECT id, topic, status, error, slide_count, created_at, updated_at
       FROM deck WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 100`,
      [session.user.id],
    );
    return c.json({ decks: rows.map(toDeckDto) });
  });

  app.get("/api/decks/:id", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const id = c.req.param("id");
    const { rows } = await pool.query(`SELECT * FROM deck WHERE id=$1 AND user_id=$2`, [
      id,
      session.user.id,
    ]);
    const deck = rows[0] as DeckRow | undefined;
    if (!deck) return c.json({ error: "not found" }, 404);
    return c.json(toDeckDto(deck));
  });

  app.get("/api/view/:id", async (c) => {
    const id = c.req.param("id");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return c.json({ error: "not found" }, 404);
    }
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "dist", "index.html"))) return c.json({ error: "not ready" }, 404);
    let deckStatus = "ready";
    if (pool) {
      try {
        const { rows } = await pool.query<{ status: string }>(`SELECT status FROM deck WHERE id=$1`, [id]);
        if (rows[0]?.status) deckStatus = rows[0].status;
      } catch {
        /* keep ready */
      }
    }
    let outline: unknown = null;
    let input: { topic?: string; slideCount?: number } = {};
    try {
      outline = JSON.parse(await readFile(join(dir, "outline.json"), "utf8"));
    } catch {
      outline = null;
    }
    try {
      input = JSON.parse(await readFile(join(dir, "input.json"), "utf8")) as typeof input;
    } catch {
      input = {};
    }
    const outlineSlides = slidesFromOutline(outline, Number(input.slideCount ?? 0));
    if (!outlineSlides.length) return c.json({ error: "not ready" }, 404);
    let markdown: string | undefined;
    try {
      markdown = await readFile(join(dir, "slides.md"), "utf8");
    } catch {
      markdown = undefined;
    }
    const progressive = deckStatus === "preview" || deckStatus === "generating";
    const rewrite = await readRewriteStatus(dir);
    const rewriting = isRewriteBuilding(rewrite);
    const { builtSlideCount } = progressive
      ? await readPreviewBuild(dir)
      : { builtSlideCount: outlineSlides.length };
    const slides = slidesForView({
      outlineSlides,
      markdown,
      progressive,
      builtSlideCount,
    });
    return c.json({
      deckId: id,
      topic: outlineTitle(outline, input.topic ?? ""),
      slideCount: slides.length,
      slides,
      status: deckStatus,
      building: progressive || rewriting,
      rewritingSlide: rewriting ? rewrite?.slide : undefined,
      rewriteError: rewrite?.status === "failed" ? rewrite.error ?? "rewrite failed" : undefined,
      embedBase: `${config.apiOrigin}/p/${id}/`,
    });
  });

  app.post("/api/decks/:id/slides/:n/rewrite", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const id = c.req.param("id");
    if (!DECK_UUID.test(id)) return c.json({ error: "not found" }, 404);
    const n = Number(c.req.param("n"));
    if (!Number.isInteger(n) || n < 1 || n > 16) return c.json({ error: "bad slide" }, 400);
    const { rows } = await pool.query(`SELECT * FROM deck WHERE id=$1 AND user_id=$2`, [
      id,
      session.user.id,
    ]);
    const deck = rows[0] as DeckRow | undefined;
    if (!deck) return c.json({ error: "not found" }, 404);
    if (deck.status !== "ready") {
      return c.json({ error: "deck not ready", status: deck.status }, 409);
    }
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "outline.json")) || !existsSync(join(dir, "slides.md"))) {
      return c.json({ error: "not found" }, 404);
    }
    let slideCount = 0;
    try {
      const outline = JSON.parse(await readFile(join(dir, "outline.json"), "utf8")) as {
        slides?: unknown[];
      };
      slideCount = Array.isArray(outline.slides) ? outline.slides.length : 0;
    } catch {
      return c.json({ error: "not found" }, 404);
    }
    if (n > slideCount) return c.json({ error: "bad slide" }, 400);

    const contentType = c.req.header("content-type") ?? "";
    let instruction = "";
    let files: ReturnType<typeof asFileList> = [];
    if (contentType.includes("multipart/form-data")) {
      const body = await c.req.parseBody({ all: true });
      instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
      files = [
        ...asFileList(body.files),
        ...asFileList(body.file),
        ...asFileList(body["files[]"]),
      ];
    } else {
      try {
        const body = await c.req.json<{ instruction?: string }>();
        instruction = (body.instruction ?? "").trim();
      } catch {
        return c.json({ error: "bad body" }, 400);
      }
    }
    if (!instruction && files.length > 0) {
      instruction = "Замени картинку на этом слайде на прикреплённое фото.";
    }
    if (instruction.length < 2 || instruction.length > 2000) {
      return c.json({ error: "bad instruction" }, 400);
    }

    const busy = await deckBusyForRewrite(id);
    if (busy) return c.json({ error: "busy", reason: busy }, 409);

    let attachedIds: string[] = [];
    if (files.length > 0) {
      const { added } = await appendDeckUploads({
        uploadRoot: config.uploadDataDir,
        deckId: id,
        files,
      });
      attachedIds = added.map((f) => f.id);
      if (attachedIds.length) {
        console.info(`[api] rewrite ${id} slide=${n} uploads+=${attachedIds.join(",")}`);
        if (!/прикрепл|upload|фото|картинк|image|изображен/i.test(instruction)) {
          instruction = `${instruction}\n\nИспользуй только что прикреплённое фото (upload ${attachedIds.join(", ")}) для image: этого слайда.`;
        }
      }
    }

    await writeRewriteStatus(dir, {
      slide: n,
      status: "running",
      instruction,
      updatedAt: new Date().toISOString(),
    });
    await enqueueRewriteSlide({ id, slide: n, instruction });
    return c.json({ deckId: id, slide: n, status: "accepted", attached: attachedIds }, 202);
  });

  app.get("/api/decks/:id/speech", async (c) => {
    const id = c.req.param("id");
    if (!DECK_UUID.test(id)) return c.json({ error: "not found" }, 404);
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "slides.md"))) return c.json({ error: "not found" }, 404);
    return c.json(await readSpeechResponse(dir));
  });

  app.put("/api/decks/:id/speech", async (c) => {
    const id = c.req.param("id");
    if (!DECK_UUID.test(id)) return c.json({ error: "not found" }, 404);
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "slides.md"))) return c.json({ error: "not found" }, 404);
    try {
      const body = await c.req.json();
      const doc = await writeSpeechDoc(dir, body);
      return c.json(doc);
    } catch {
      return c.json({ error: "bad speech" }, 400);
    }
  });

  app.post("/api/decks/:id/speech/regenerate", async (c) => {
    const id = c.req.param("id");
    if (!DECK_UUID.test(id)) return c.json({ error: "not found" }, 404);
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "outline.json")) || !existsSync(join(dir, "slides.md"))) {
      return c.json({ error: "not found" }, 404);
    }
    try {
      const outline = JSON.parse(await readFile(join(dir, "outline.json"), "utf8")) as {
        title: string;
        slides: Array<{ heading: string }>;
      };
      const slidesMd = await readFile(join(dir, "slides.md"), "utf8");
      let locale = "ru";
      try {
        const input = JSON.parse(await readFile(join(dir, "input.json"), "utf8")) as {
          locale?: string;
        };
        if (input.locale) locale = input.locale;
      } catch {
        /* default ru */
      }
      const { generateSpeechForDeck } = await import("./speech-agent.js");
      const doc = await generateSpeechForDeck({ workDir: dir, outline, locale, slidesMd });
      return c.json(doc);
    } catch (err) {
      console.error(`[speech] regenerate ${id}`, err);
      return c.json({ error: "speech failed" }, 500);
    }
  });

  app.get("/api/decks/:id/export/speech-pdf", async (c) => {
    const id = c.req.param("id");
    if (!DECK_UUID.test(id)) return c.json({ error: "not found" }, 404);
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "slides.md"))) return c.json({ error: "not found" }, 404);
    const speech = await readSpeechResponse(dir);
    if (isSpeechMissingResult(speech)) return c.json({ error: "speech missing" }, 404);
    let topic = "presentation";
    try {
      const outline = JSON.parse(await readFile(join(dir, "outline.json"), "utf8"));
      const input = JSON.parse(await readFile(join(dir, "input.json"), "utf8")) as { topic?: string };
      topic = outlineTitle(outline, input.topic ?? topic) || topic;
    } catch {
      /* keep default */
    }
    try {
      const { ensureSpeechPdf, speechDownloadBasename } = await import("./speech-pdf.js");
      const file = await ensureSpeechPdf(dir, topic);
      const bytes = await readFile(file);
      return c.body(new Uint8Array(bytes), 200, {
        "content-type": "application/pdf",
        "content-disposition": contentDisposition(speechDownloadBasename(topic)),
        "cache-control": "private, max-age=3600",
      });
    } catch (err) {
      console.error(`[export] ${id} speech-pdf`, err);
      return c.json({ error: "export failed" }, 500);
    }
  });

  app.get("/api/decks/:id/export/:format", async (c) => {
    const id = c.req.param("id");
    const format = c.req.param("format");
    if (!DECK_UUID.test(id)) {
      return c.json({ error: "not found" }, 404);
    }
    if (!isExportFormat(format)) return c.json({ error: "bad format" }, 400);
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "slides.md")) || !existsSync(join(dir, "dist", "index.html"))) {
      return c.json({ error: "not ready" }, 404);
    }
    let topic = "presentation";
    try {
      const outline = JSON.parse(await readFile(join(dir, "outline.json"), "utf8"));
      const input = JSON.parse(await readFile(join(dir, "input.json"), "utf8")) as { topic?: string };
      topic = outlineTitle(outline, input.topic ?? topic) || topic;
    } catch {
      /* keep default */
    }
    try {
      const file = await ensureDeckExport(dir, format);
      const bytes = await readFile(file);
      const name = downloadBasename(topic, format);
      return c.body(new Uint8Array(bytes), 200, {
        "content-type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "content-disposition": contentDisposition(name),
        "cache-control": "private, max-age=3600",
      });
    } catch (err) {
      console.error(`[export] ${id} ${format}`, err);
      return c.json({ error: "export failed" }, 500);
    }
  });

  app.get("/p/:id/*", async (c) => {
    const id = c.req.param("id");
    const rest = c.req.path.replace(`/p/${id}`, "") || "/";
    const base = join(config.deckDataDir, id, "dist");
    const rel = rest === "/" ? "index.html" : rest.replace(/^\//, "");
    const file = normalize(join(base, rel));
    if (!file.startsWith(normalize(base))) return c.text("no", 403);
    const target = existsSync(file) ? file : join(base, "index.html");
    if (!existsSync(target)) return c.text("not ready", 404);
    const ext = extname(target);
    const raw = await readFile(target);
    const body = ext === ".html" ? injectPlayerChromeHide(raw.toString("utf8")) : new Uint8Array(raw);
    return c.body(body, 200, {
      "content-type": deckAssetContentType(ext),
      "cache-control": deckAssetCacheControl(ext),
    });
  });

  app.get("/p/:id", (c) => c.redirect(`/p/${c.req.param("id")}/`));

  return app;
}
