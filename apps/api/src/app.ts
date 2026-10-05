import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./env.js";
import { pool } from "./migrate.js";
import { createAuth } from "./auth.js";
import { enqueueDeck } from "./queue.js";
import { isSafePath } from "./md-guard.js";
import { toDeckDto, type DeckRow } from "./deck-dto.js";
import { outlineTitle, slidesFromOutline } from "./view-meta.js";

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

  app.post("/api/decks", async (c) => {
    if (!auth || !pool) return c.json({ error: "unavailable" }, 503);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<{
      topic?: string;
      locale?: string;
      slideCount?: number;
      audience?: string;
      theme?: string;
    }>();
    const topic = (body.topic ?? "").trim();
    if (topic.length < 5 || topic.length > 500) return c.json({ error: "bad topic" }, 400);
    const slideCount = Math.min(16, Math.max(6, Number(body.slideCount ?? 8)));
    const id = randomUUID();
    await pool.query(
      `INSERT INTO deck (id, user_id, topic, locale, slide_count, audience, theme, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'queued')`,
      [
        id,
        session.user.id,
        topic,
        body.locale ?? "ru",
        slideCount,
        body.audience ?? "school",
        body.theme ?? "default",
      ],
    );
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
    const slides = slidesFromOutline(outline, Number(input.slideCount ?? 0));
    if (!slides.length) return c.json({ error: "not ready" }, 404);
    return c.json({
      deckId: id,
      topic: outlineTitle(outline, input.topic ?? ""),
      slideCount: slides.length,
      slides,
      embedBase: `${config.apiOrigin}/p/${id}/`,
    });
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
    const types: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".json": "application/json",
    };
    const body = await readFile(target);
    return c.body(body, 200, { "content-type": types[extname(target)] ?? "application/octet-stream" });
  });

  app.get("/p/:id", (c) => c.redirect(`/p/${c.req.param("id")}/`));

  return app;
}
