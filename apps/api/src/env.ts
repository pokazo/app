export function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/** Positive int from env; clamp to [min, max]. Invalid → fallback. */
export function envInt(name: string, fallback: number, opts?: { min?: number; max?: number }): number {
  const min = opts?.min ?? 1;
  const max = opts?.max ?? 64;
  const raw = Number(env(name, String(fallback)));
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

export const config = {
  port: Number(env("PORT", "3000")),
  appOrigin: env("APP_ORIGIN", "http://localhost:5173"),
  apiOrigin: env("API_ORIGIN", "http://localhost:3000"),
  authSecret: env("BETTER_AUTH_SECRET", "change-me-to-at-least-32-characters-long"),
  databaseUrl: env("DATABASE_URL"),
  redisUrl: env("REDIS_URL", "redis://localhost:6379"),
  /** Parallel deck generates (BullMQ worker concurrency). */
  deckGenerateConcurrency: envInt("DECK_GENERATE_CONCURRENCY", 8, { min: 1, max: 32 }),
  /** Parallel rewrite / structure (delete/move/insert) jobs. */
  deckEditConcurrency: envInt("DECK_EDIT_CONCURRENCY", 4, { min: 1, max: 16 }),
  yandexClientId: env("YANDEX_CLIENT_ID"),
  yandexClientSecret: env("YANDEX_CLIENT_SECRET"),
  yandexSearchApiKey: env("YANDEX_SEARCH_API_KEY"),
  yandexFolderId: env("YANDEX_FOLDER_ID"),
  /** HTTP base for yandex-images service (e.g. http://91.207.75.72:3021). Empty disables tools. */
  yandexImagesUrl: env("YANDEX_IMAGES_URL"),

  smtpHost: env("SMTP_HOST"),
  smtpPort: Number(env("SMTP_PORT", "587")),
  smtpUser: env("SMTP_USER"),
  smtpPass: env("SMTP_PASS"),
  smtpFrom: env("SMTP_FROM", "Показо <noreply@pokazo.ru>"),
  /** Inbox for the public contact form. */
  contactTo: env("CONTACT_TO", "mail@antonbutov.com"),
  openrouterKey: env("OPENROUTER_API_KEY"),
  openrouterBaseUrl: env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  outlineModel: env("LLM_OUTLINE_MODEL", "openai/gpt-4.1-mini"),
  composeModel: env("LLM_COMPOSE_MODEL", "deepseek/deepseek-v4-flash"),
  llmReferer: env("LLM_HTTP_REFERER", "https://pokazo.ru"),
  llmTitle: env("LLM_APP_TITLE", "Pokazo"),
  deckDataDir: env("DECK_DATA_DIR", "./data/decks"),
  /** Separate from decks — originals kept for error triage / upload-images MCP. */
  uploadDataDir: env("UPLOAD_DATA_DIR", "./data/uploads"),
  unsplashAccessKey: env("UNSPLASH_ACCESS_KEY"),
  unsplashApiBase: env("UNSPLASH_API_BASE", "https://api.unsplash.com"),
  unsplashImagesBase: env("UNSPLASH_IMAGES_BASE"),
  openaiApiKey: env("OPENAI_API_KEY"),
  openaiImageModel: env("OPENAI_IMAGE_MODEL", "gpt-image-1-mini"),
  openaiImageApiBase: env("OPENAI_IMAGE_API_BASE", "https://api.openai.com/v1"),
  publicBaseUrl: env("PUBLIC_BASE_URL", "http://localhost:5173"),
  paymentsEnabled: env("PAYMENTS_ENABLED", "false") === "true",
  billingFreeUnlock: env("BILLING_FREE_UNLOCK", "false") === "true",
  tochkaAccessToken: env("TOCHKA_ACCESS_TOKEN"),
  tochkaCustomerCode: env("TOCHKA_CUSTOMER_CODE"),
  tochkaMerchantId: env("TOCHKA_MERCHANT_ID"),
  tochkaApiBaseUrl: env("TOCHKA_API_BASE_URL", "https://enter.tochka.com"),
  priceCreditKopecks: Number(env("PRICE_CREDIT_KOPECKS", "19900")),
  priceMonthKopecks: Number(env("PRICE_MONTH_KOPECKS", "39900")),
  /**
   * Long-lived Slidev (dev) pool for owner HMR edits. Off unless SLIDEV_DEV_POOL=true.
   * Cap low on shared 8GB VPS (~600MB RSS each).
   */
  slidevDevPoolMax:
    env("SLIDEV_DEV_POOL", "false") === "true"
      ? envInt("SLIDEV_DEV_POOL_MAX", 2, { min: 0, max: 4 })
      : 0,
  /** Evict idle live sessions after this many ms (default 10 min). */
  slidevDevPoolIdleMs: envInt("SLIDEV_DEV_POOL_IDLE_MS", 600_000, {
    min: 60_000,
    max: 3_600_000,
  }),
};
