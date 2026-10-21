import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { config } from "./env.js";
import { sendContactEmail } from "./mail.js";
import { handleContact } from "./contact.js";
import { pool } from "./migrate.js";
import { createAuth } from "./auth.js";
import {
  deckBusyForRewrite,
  enqueueDeck,
  enqueueRewriteSlide,
  enqueueStructureSlide,
  enqueueDeckRetheme,
} from "./queue.js";
import { isSafePath } from "./md-guard.js";
import { toDeckDto, type DeckRow } from "./deck-dto.js";
import { outlineTitle, slidesForView, slidesFromOutline, withImageThumbs } from "./view-meta.js";
import {
  injectPlayerChromeHide,
  deckAssetCacheControl,
  deckAssetContentType,
  deckAssetNotModified,
  deckAssetValidators,
} from "./player-chrome.js";
import { requestWantsStaticPlayer } from "./slidev-dev-proxy.js";
import { sanitizePickerTheme } from "./themes.js";
import { sanitizeAudience } from "./audience.js";
import {
  contentDisposition,
  downloadBasename,
  ensureDeckExport,
  isExportFormat,
} from "./deck-export.js";
import {
  buildResearchArchive,
  factsDownloadBasename,
  ResearchArchiveEmptyError,
} from "./research-export.js";
import { isSpeechMissingResult, readSpeechResponse, writeSpeechDoc } from "./speech-http.js";
import {
  expireStaleRewriteStatus,
  isRewriteBuilding,
  readRewriteStatus,
  viewEditKind,
  writeRewriteStatus,
} from "./rewrite-status.js";
import { parseOutline } from "./outline.js";
import { maxViewSlideCount } from "./rewrite-lock.js";
import {
  mutateSlideStructure,
  type StructureOp,
} from "./slide-structure.js";
import { gateDeckRetheme } from "./deck-retheme.js";
import { activityLabelForPhase, readDeckActivity, writeDeckActivity } from "./activity.js";
import { readPreviewBuild } from "./progressive-preview.js";
import { appendDeckUploads, persistDeckUploads } from "./upload-store.js";
import {
  applyPaidPayment,
  billingLog,
  finalizeDeckBilling,
  getBillingCatalog,
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

type DeckOwnerOk = { ok: true; id: string; deck: DeckRow };
type DeckOwnerErr = { ok: false; res: Response };

/** Session + row for the deck owner; 401/404/503 otherwise. */
async function requireDeckOwner(
  c: Context,
  auth: ReturnType<typeof createAuth>,
): Promise<DeckOwnerOk | DeckOwnerErr> {
  if (!auth || !pool) return { ok: false, res: c.json({ error: "unavailable" }, 503) };
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return { ok: false, res: c.json({ error: "unauthorized" }, 401) };
  const id = c.req.param("id") ?? "";
  if (!DECK_UUID.test(id)) return { ok: false, res: c.json({ error: "not found" }, 404) };
  const { rows } = await pool.query(`SELECT * FROM deck WHERE id=$1 AND user_id=$2`, [
    id,
    session.user.id,
  ]);
  const deck = rows[0] as DeckRow | undefined;
  if (!deck) return { ok: false, res: c.json({ error: "not found" }, 404) };
  return { ok: true, id, deck };
}

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

  app.post("/api/contact", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = null;
    }
    const result = await handleContact({
      body,
      forwardedFor: c.req.header("x-forwarded-for"),
      send: sendContactEmail,
    });
    return c.json(result.body, result.status);
  });

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

  app.get("/api/billing/catalog", (c) => c.json(getBillingCatalog()));

  app.get("/api/billing/me", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: "unauthorized" }, 401);
    return c.json(await getBillingMe(session.user.id));
  });

  app.post("/api/billing/checkout", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    if (!config.paymentsEnabled) return c.json({ error: "payments disabled" }, 403);
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
    const userId = session.user.id;
    await pool.query(
      `INSERT INTO payment (id, user_id, product, amount_kopecks, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [paymentId, userId, product, amountKopecks],
    );
    billingLog("info", "checkout_pending", {
      paymentId,
      userId,
      product,
      amountKopecks,
    });

    const successRedirectUrl = `${config.publicBaseUrl}/app?paid=1`;
    if (config.billingFreeUnlock) {
      const operationId = `free-${paymentId}`;
      await applyPaidPayment(paymentId, operationId);
      await pool.query(
        `UPDATE payment SET payment_url=$2 WHERE id=$1`,
        [paymentId, successRedirectUrl],
      );
      billingLog("info", "checkout_free_unlock", {
        paymentId,
        userId,
        product,
        amountKopecks,
      });
      return c.json({ paymentId, paymentUrl: successRedirectUrl, amountKopecks });
    }

    try {
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
      billingLog("info", "checkout_created", {
        paymentId,
        userId,
        product,
        amountKopecks,
        operationId: payment.operationId,
      });
      return c.json({
        paymentId,
        paymentUrl: payment.paymentUrl,
        amountKopecks,
      });
    } catch (error) {
      billingLog(
        "error",
        "checkout_tochka_failed",
        { paymentId, userId, product, amountKopecks },
        error,
      );
      return c.json({ error: "payment provider error", paymentId }, 502);
    }
  });

  app.post("/api/payments/tochka/webhook", async (c) => {
    const rawBody = (await c.req.text()).trim();
    const bodyKind = rawBody.startsWith("{")
      ? "json"
      : rawBody.startsWith("eyJ") || rawBody.startsWith('"eyJ')
        ? "jwt"
        : "other";
    billingLog("info", "webhook_received", {
      bodyKind,
      bodyLen: rawBody.length,
    });

    const stubJson =
      rawBody.startsWith("{") &&
      (config.billingFreeUnlock || !config.tochkaAccessToken.trim());

    const event = await parseTochkaWebhook(rawBody);
    if (!event) {
      billingLog("warn", "webhook_rejected", { reason: "parse_failed", bodyKind });
      return c.json({ error: "bad webhook" }, 400);
    }
    if (!event.verifiedJwt && !stubJson) {
      billingLog("warn", "webhook_rejected", {
        reason: "unsigned",
        status: event.status,
        paymentLinkId: event.paymentLinkId,
        operationId: event.operationId,
      });
      return c.json({ error: "bad webhook" }, 400);
    }
    billingLog("info", "webhook_parsed", {
      status: event.status,
      paymentLinkId: event.paymentLinkId,
      operationId: event.operationId,
      verifiedJwt: event.verifiedJwt,
      stubJson,
    });
    if (!pool || !isTochkaPaidStatus(event.status)) {
      billingLog("info", "webhook_ignored", {
        reason: !pool ? "no_pool" : "not_paid_status",
        status: event.status,
        paymentLinkId: event.paymentLinkId,
        operationId: event.operationId,
      });
      return c.json({ ok: true });
    }

    try {
      let paymentId: string | undefined;
      if (event.paymentLinkId) {
        const result = await pool.query<{ id: string }>(
          `SELECT id FROM payment WHERE id=$1 LIMIT 1`,
          [event.paymentLinkId],
        );
        paymentId = result.rows[0]?.id;
      }
      if (!paymentId && event.verifiedJwt && event.operationId) {
        const result = await pool.query<{ id: string }>(
          `SELECT id FROM payment WHERE tochka_operation_id=$1 LIMIT 1`,
          [event.operationId],
        );
        paymentId = result.rows[0]?.id;
      }
      if (paymentId) {
        const result = await applyPaidPayment(
          paymentId,
          event.operationId ?? `stub-payment-${paymentId}`,
        );
        billingLog("info", "webhook_activated", {
          paymentId,
          result,
          paymentLinkId: event.paymentLinkId,
          operationId: event.operationId,
        });
      } else {
        billingLog("warn", "webhook_not_found", {
          paymentLinkId: event.paymentLinkId,
          operationId: event.operationId,
          status: event.status,
        });
      }
    } catch (error) {
      billingLog(
        "error",
        "webhook_failed",
        {
          paymentLinkId: event.paymentLinkId,
          operationId: event.operationId,
          status: event.status,
        },
        error,
      );
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
        sanitizeAudience(fields.audience),
        sanitizePickerTheme(fields.theme),
      ],
    );
    const reserved = await reserveGenerate(session.user.id, id);
    if (!reserved.ok) {
      await pool.query(`DELETE FROM deck WHERE id=$1`, [id]);
      const billing = await getBillingMe(session.user.id);
      billingLog("info", "deck_payment_required", {
        userId: session.user.id,
        deckId: id,
        credits: billing.credits,
        freeAvailable: billing.freeAvailable,
        plan: billing.plan,
      });
      return c.json({ error: "payment_required", billing }, 402);
    }
    if (files.length > 0) {
      try {
        const manifest = await persistDeckUploads({
          uploadRoot: config.uploadDataDir,
          deckId: id,
          files,
        });
        console.info(`[api] deck ${id} uploads=${manifest.files.length}`);
      } catch (error) {
        await pool.query(
          `UPDATE deck SET status='failed', error=$2, updated_at=now() WHERE id=$1`,
          [id, String(error)],
        );
        try {
          await finalizeDeckBilling(id, "failed");
        } catch (billingError) {
          billingLog(
            "error",
            "finalize_failed",
            { deckId: id, outcome: "failed", reason: "upload_persist" },
            billingError,
          );
        }
        throw error;
      }
    }
    await enqueueDeck(id);
    return c.json({ deckId: id, status: "queued" }, 201);
  });

  app.get("/api/decks", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const { rows } = await pool.query<DeckRow>(
      `SELECT id, topic, status, error, slide_count, theme, created_at, updated_at
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
    const dto = toDeckDto(deck);
    const activity =
      deck.status === "queued" ||
      deck.status === "generating" ||
      deck.status === "preview" ||
      deck.status === "building"
        ? (await readDeckActivity(join(config.deckDataDir, id)))?.label ?? null
        : null;
    return c.json({ ...dto, activity });
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
    const rewrite = await expireStaleRewriteStatus(dir);
    const rewriting = isRewriteBuilding(rewrite);
    const { builtSlideCount } = progressive
      ? await readPreviewBuild(dir)
      : { builtSlideCount: outlineSlides.length };
    const slides = withImageThumbs(
      slidesForView({
        outlineSlides,
        markdown,
        progressive,
        builtSlideCount,
      }),
      join(dir, "dist"),
    );
    const thumbHits = slides.filter((s) => s.imageThumb).length;
    const v2Hits = slides.filter((s) => s.imageThumb?.includes("/thumbs/v2/")).length;
    const v1Hits = slides.filter(
      (s) => s.imageThumb?.startsWith("/thumbs/") && !s.imageThumb.includes("/thumbs/v2/"),
    ).length;
    console.info(
      `[view] deck=${id} slides=${slides.length} filmstripThumbs=${thumbHits} v2=${v2Hits} v1=${v1Hits}`,
    );
    const activity =
      progressive || rewriting
        ? (await readDeckActivity(dir))?.label ?? null
        : null;
    return c.json({
      deckId: id,
      topic: outlineTitle(outline, input.topic ?? ""),
      slideCount: slides.length,
      slides,
      status: deckStatus,
      building: progressive || rewriting,
      editKind: viewEditKind({
        progressive,
        rewriting,
        instruction: rewrite?.instruction,
      }),
      activity,
      rewritingSlide: rewriting ? rewrite?.slide : undefined,
      rewriteError: rewrite?.status === "failed" ? rewrite.error ?? "rewrite failed" : undefined,
      embedBase: `${config.apiOrigin}/p/${id}/`,
      livePreview: (await import("./slidev-dev-pool.js")).isSlidevDevLive(id),
    });
  });

  /** Start / touch long-lived Slidev (dev) for owner HMR edits. */
  app.post("/api/decks/:id/live", async (c) => {
    const { slidevDevPoolEnabled, ensureSlidevDev } = await import("./slidev-dev-pool.js");
    if (!slidevDevPoolEnabled()) return c.json({ error: "live preview disabled" }, 404);
    const owner = await requireDeckOwner(c, auth);
    if (!owner.ok) return owner.res;
    const { id } = owner;
    if (owner.deck.status !== "ready") {
      return c.json({ error: "deck not ready" }, 409);
    }
    const dir = join(config.deckDataDir, id);
    try {
      const t0 = Date.now();
      const session = await ensureSlidevDev(id, dir);
      console.info(`[slidev-dev] ensure ok deck=${id} port=${session.port} ms=${Date.now() - t0}`);
      return c.json({ ok: true, livePreview: true, port: session.port });
    } catch (err) {
      console.warn(`[slidev-dev] ensure fail deck=${id}: ${String(err).slice(0, 300)}`);
      return c.json({ error: "live preview failed", detail: String(err).slice(0, 200) }, 500);
    }
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
      console.warn(
        `[edit] rewrite_rejected deck=${id} slide=${n} reason=deck_not_ready status=${deck.status}`,
      );
      return c.json({ error: "deck not ready", status: deck.status }, 409);
    }
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "outline.json")) || !existsSync(join(dir, "slides.md"))) {
      return c.json({ error: "not found" }, 404);
    }
    let outlineCount = 0;
    try {
      const outline = JSON.parse(await readFile(join(dir, "outline.json"), "utf8")) as {
        slides?: unknown[];
      };
      outlineCount = Array.isArray(outline.slides) ? outline.slides.length : 0;
    } catch {
      return c.json({ error: "not found" }, 404);
    }
    let slidesMd = "";
    try {
      slidesMd = await readFile(join(dir, "slides.md"), "utf8");
    } catch {
      return c.json({ error: "not found" }, 404);
    }
    const maxView = maxViewSlideCount(slidesMd, outlineCount);
    if (n < 1 || n > maxView) return c.json({ error: "bad slide" }, 400);

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
    if (busy) {
      const running = await readRewriteStatus(dir);
      const runningAt = running?.updatedAt ? Date.parse(running.updatedAt) : NaN;
      const runningAgeMs = Number.isFinite(runningAt) ? Date.now() - runningAt : null;
      console.warn(
        `[edit] rewrite_rejected deck=${id} slide=${n} reason=busy busy=${busy} runningSlide=${running?.slide ?? "-"} runningStatus=${running?.status ?? "-"} runningAgeMs=${runningAgeMs ?? "unknown"} runningInstruction=${JSON.stringify((running?.instruction ?? "").slice(0, 120))} instruction=${JSON.stringify(instruction.slice(0, 120))}`,
      );
      return c.json({ error: "busy", reason: busy }, 409);
    }

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
    try {
      await writeDeckActivity(dir, activityLabelForPhase("rewrite"));
    } catch {
      /* non-fatal for UI poll */
    }
    await enqueueRewriteSlide({ id, slide: n, instruction });
    console.info(
      `[edit] rewrite_accepted deck=${id} slide=${n} attached=${attachedIds.length} instruction=${JSON.stringify(instruction.slice(0, 120))}`,
    );
    return c.json({ deckId: id, slide: n, status: "accepted", attached: attachedIds }, 202);
  });

  const acceptStructureOp = async (c: Context, op: StructureOp, focusSlide: number) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const id = c.req.param("id") ?? "";
    if (!DECK_UUID.test(id)) return c.json({ error: "not found" }, 404);
    const { rows } = await pool.query(`SELECT * FROM deck WHERE id=$1 AND user_id=$2`, [
      id,
      session.user.id,
    ]);
    const deck = rows[0] as DeckRow | undefined;
    if (!deck) return c.json({ error: "not found" }, 404);
    if (deck.status !== "ready") {
      console.warn(
        `[edit] structure_rejected deck=${id} op=${op.op} reason=deck_not_ready status=${deck.status}`,
      );
      return c.json({ error: "deck not ready", status: deck.status }, 409);
    }
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "outline.json")) || !existsSync(join(dir, "slides.md"))) {
      return c.json({ error: "not found" }, 404);
    }
    let outline;
    let slidesMd: string;
    try {
      slidesMd = await readFile(join(dir, "slides.md"), "utf8");
      outline = parseOutline(JSON.parse(await readFile(join(dir, "outline.json"), "utf8")));
    } catch (err) {
      // Missing files → 404; corrupt/outdated outline → 400 (parseOutline fills additive fields).
      if (err && typeof err === "object" && "issues" in err) {
        return c.json({ error: "bad outline" }, 400);
      }
      return c.json({ error: "not found" }, 404);
    }
    try {
      mutateSlideStructure(slidesMd, outline, op);
    } catch (err) {
      const msg = String(err);
      if (/min slides|max slides|bad slide|bad move|no slides/.test(msg)) {
        console.warn(
          `[edit] structure_rejected deck=${id} op=${op.op} reason=validation err=${msg.replace(/^Error:\s*/, "")}`,
        );
        return c.json({ error: msg.replace(/^Error:\s*/, "") }, 400);
      }
      throw err;
    }
    const busy = await deckBusyForRewrite(id);
    if (busy) {
      console.warn(
        `[edit] structure_rejected deck=${id} op=${op.op} reason=busy busy=${busy}`,
      );
      return c.json({ error: "busy", reason: busy }, 409);
    }
    await writeRewriteStatus(dir, {
      slide: focusSlide,
      status: "running",
      instruction: `structure:${op.op}`,
      updatedAt: new Date().toISOString(),
    });
    try {
      await writeDeckActivity(dir, activityLabelForPhase("structure"));
    } catch {
      /* non-fatal */
    }
    await enqueueStructureSlide({ id, op });
    console.info(
      `[edit] structure_accepted deck=${id} op=${op.op} slide=${focusSlide}`,
    );
    return c.json({ deckId: id, status: "accepted", op: op.op, slide: focusSlide }, 202);
  };

  app.post("/api/decks/:id/slides/:n/move", async (c) => {
    const n = Number(c.req.param("n"));
    if (!Number.isInteger(n) || n < 1 || n > 16) return c.json({ error: "bad slide" }, 400);
    let to: number;
    try {
      const body = await c.req.json<{ to?: number; direction?: string }>();
      if (typeof body.to === "number" && Number.isInteger(body.to)) {
        to = body.to;
      } else if (body.direction === "up" || body.direction === "down") {
        to = body.direction === "up" ? n - 1 : n + 1;
      } else {
        return c.json({ error: "bad target" }, 400);
      }
    } catch {
      return c.json({ error: "bad body" }, 400);
    }
    if (to < 1 || to > 16) return c.json({ error: "bad move" }, 400);
    return acceptStructureOp(c, { op: "move", from: n, to }, to);
  });

  app.delete("/api/decks/:id/slides/:n", async (c) => {
    const n = Number(c.req.param("n"));
    if (!Number.isInteger(n) || n < 1 || n > 16) return c.json({ error: "bad slide" }, 400);
    return acceptStructureOp(c, { op: "delete", viewIndex: n }, n);
  });

  app.post("/api/decks/:id/slides", async (c) => {
    let after: number;
    try {
      const body = await c.req.json<{ after?: number }>();
      after = Number(body.after);
      if (!Number.isInteger(after) || after < 1 || after > 16) {
        return c.json({ error: "bad slide" }, 400);
      }
    } catch {
      return c.json({ error: "bad body" }, 400);
    }
    return acceptStructureOp(c, { op: "insert", after }, after + 1);
  });

  app.post("/api/decks/:id/theme", async (c) => {
    const owner = await requireDeckOwner(c, auth);
    if (!owner.ok) return owner.res;
    const { id, deck } = owner;
    let themeRaw = "";
    try {
      const body = await c.req.json<{ theme?: string }>();
      themeRaw = typeof body.theme === "string" ? body.theme : "";
    } catch {
      return c.json({ error: "bad body" }, 400);
    }
    const dir = join(config.deckDataDir, id);
    const hasSlides = existsSync(join(dir, "slides.md"));
    const busy = await deckBusyForRewrite(id);
    const gate = gateDeckRetheme({
      deckStatus: deck.status,
      hasSlides,
      busy,
      theme: themeRaw,
    });
    if (!gate.ok) {
      console.warn(
        `[edit] theme_rejected deck=${id} reason=${gate.error} status=${deck.status} theme=${JSON.stringify(themeRaw)}`,
      );
      if (gate.error === "deck not ready") {
        return c.json({ error: gate.error, status: gate.deckStatus }, gate.status);
      }
      if (gate.error === "busy") {
        return c.json({ error: gate.error, reason: gate.reason }, gate.status);
      }
      return c.json({ error: gate.error }, gate.status);
    }
    await writeRewriteStatus(dir, {
      slide: 1,
      status: "running",
      instruction: `theme:${gate.theme}`,
      updatedAt: new Date().toISOString(),
    });
    try {
      await writeDeckActivity(dir, activityLabelForPhase("theme"));
    } catch {
      /* non-fatal */
    }
    await enqueueDeckRetheme({ id, theme: gate.theme });
    console.info(`[edit] theme_accepted deck=${id} theme=${gate.theme}`);
    return c.json({ deckId: id, status: "accepted", theme: gate.theme }, 202);
  });

  app.get("/api/decks/:id/speech", async (c) => {
    const owner = await requireDeckOwner(c, auth);
    if (!owner.ok) return owner.res;
    const { id } = owner;
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "slides.md"))) return c.json({ error: "not found" }, 404);
    return c.json(await readSpeechResponse(dir));
  });

  app.put("/api/decks/:id/speech", async (c) => {
    const owner = await requireDeckOwner(c, auth);
    if (!owner.ok) return owner.res;
    const { id } = owner;
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
    const owner = await requireDeckOwner(c, auth);
    if (!owner.ok) return owner.res;
    const { id } = owner;
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
    const owner = await requireDeckOwner(c, auth);
    if (!owner.ok) return owner.res;
    const { id } = owner;
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

  app.get("/api/decks/:id/export/facts", async (c) => {
    const owner = await requireDeckOwner(c, auth);
    if (!owner.ok) return owner.res;
    const { id } = owner;
    const dir = join(config.deckDataDir, id);
    if (!existsSync(join(dir, "slides.md"))) return c.json({ error: "not found" }, 404);
    let topic = "presentation";
    try {
      const outline = JSON.parse(await readFile(join(dir, "outline.json"), "utf8"));
      const input = JSON.parse(await readFile(join(dir, "input.json"), "utf8")) as { topic?: string };
      topic = outlineTitle(outline, input.topic ?? topic) || topic;
    } catch {
      /* keep default */
    }
    try {
      const bytes = await buildResearchArchive(dir);
      return c.body(new Uint8Array(bytes), 200, {
        "content-type": "application/zip",
        "content-disposition": contentDisposition(factsDownloadBasename(topic)),
        "cache-control": "private, max-age=3600",
      });
    } catch (err) {
      if (err instanceof ResearchArchiveEmptyError) {
        return c.json({ error: "not found" }, 404);
      }
      console.error(`[export] ${id} facts`, err);
      return c.json({ error: "export failed" }, 500);
    }
  });

  app.get("/api/decks/:id/export/:format", async (c) => {
    const owner = await requireDeckOwner(c, auth);
    if (!owner.ok) return owner.res;
    const { id } = owner;
    const format = c.req.param("format");
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
    const reqUrl = new URL(c.req.url);
    const pkStatic = requestWantsStaticPlayer(reqUrl.search);
    // `?pkStatic=1` is the viewer iframe: built dist, never the Vite dev graph.
    // A live session left dist behind slides.md — rebuild that player instead of
    // compiling hundreds of dev modules on refresh.
    if (auth && pool && DECK_UUID.test(id)) {
      const { isSlidevDevLive, deckDistBehindMarkdown, stopSlidevDev } = await import(
        "./slidev-dev-pool.js"
      );
      const dir = join(config.deckDataDir, id);
      if (pkStatic) {
        if (isSlidevDevLive(id)) {
          await stopSlidevDev(id);
          console.info(`[slidev-dev] stop for static player deck=${id}`);
        }
        if (deckDistBehindMarkdown(dir)) {
          try {
            const { rebuildStaleDeckDist } = await import("./deck-dist-rebuild.js");
            await rebuildStaleDeckDist(id, dir);
          } catch (err) {
            console.warn(
              `[dist] static rebuild failed deck=${id}: ${String(err).slice(0, 200)}`,
            );
          }
        }
      } else {
        const db = pool;
        const owner = async () => {
          const session = await auth.api.getSession({ headers: c.req.raw.headers });
          if (!session?.user) return false;
          const { rows } = await db.query(`SELECT 1 FROM deck WHERE id=$1 AND user_id=$2`, [
            id,
            session.user.id,
          ]);
          return Boolean(rows[0]);
        };
        const proxyLive = async () => {
          const { proxyHttpToSlidevDev, viteHtmlIsSlideDocument, shouldProxyDeckToLive } =
            await import("./slidev-dev-proxy.js");
          if (!(await owner())) return null;
          if (
            !shouldProxyDeckToLive({
              pkStatic: false,
              owner: true,
              live: isSlidevDevLive(id),
            })
          ) {
            return null;
          }
          const proxied = await proxyHttpToSlidevDev(c.req.raw, id);
          if (!proxied) return null;
          const ct = proxied.headers.get("content-type") || "";
          const pathname = new URL(c.req.url).pathname;
          if (viteHtmlIsSlideDocument(pathname, ct)) {
            const html = injectPlayerChromeHide(await proxied.text());
            return new Response(html, {
              status: proxied.status,
              headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
            });
          }
          // File request that Vite answered with index.html — serve dist instead.
          if (!ct.toLowerCase().includes("text/html")) return proxied;
          return null;
        };
        // Do not boot Vite from a GET. A refresh used to block here and then
        // download the dev module graph (~300 requests) before the slide painted.
        if (isSlidevDevLive(id)) {
          const live = await proxyLive();
          if (live) return live;
        }
      }
    }
    const rest = c.req.path.replace(`/p/${id}`, "") || "/";
    const base = join(config.deckDataDir, id, "dist");
    const rel = rest === "/" ? "index.html" : rest.replace(/^\//, "");
    const file = normalize(join(base, rel));
    if (!file.startsWith(normalize(base))) return c.text("no", 403);
    let target = existsSync(file) ? file : "";
    if (!target) {
      const thumb = /^thumbs\/v2\/(\d+)\.webp$/.exec(rel);
      if (thumb) {
        const backup = join(config.deckDataDir, id, ".filmstrip-thumbs", `${thumb[1]}.webp`);
        if (existsSync(backup) && normalize(backup).startsWith(normalize(join(config.deckDataDir, id)))) {
          target = backup;
        }
      }
    }
    if (!target) target = join(base, "index.html");
    if (!existsSync(target)) return c.text("not ready", 404);
    const ext = extname(target);
    const cacheControl = deckAssetCacheControl(ext, rel);
    if (ext !== ".html") {
      const st = await stat(target);
      const validators = deckAssetValidators(st.size, st.mtimeMs);
      const headers = {
        "content-type": deckAssetContentType(ext),
        "cache-control": cacheControl,
        etag: validators.etag,
        "last-modified": validators.lastModified,
      };
      if (
        deckAssetNotModified(
          c.req.header("if-none-match"),
          c.req.header("if-modified-since"),
          validators,
        )
      ) {
        return new Response(null, { status: 304, headers });
      }
      const raw = await readFile(target);
      return c.body(new Uint8Array(raw), 200, headers);
    }
    const raw = await readFile(target);
    return c.body(injectPlayerChromeHide(raw.toString("utf8")), 200, {
      "content-type": deckAssetContentType(ext),
      "cache-control": cacheControl,
    });
  });

  app.get("/p/:id", (c) => c.redirect(`/p/${c.req.param("id")}/`));

  return app;
}
