export function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(env("PORT", "3000")),
  appOrigin: env("APP_ORIGIN", "http://localhost:5173"),
  apiOrigin: env("API_ORIGIN", "http://localhost:3000"),
  authSecret: env("BETTER_AUTH_SECRET", "change-me-to-at-least-32-characters-long"),
  databaseUrl: env("DATABASE_URL"),
  redisUrl: env("REDIS_URL", "redis://localhost:6379"),
  yandexClientId: env("YANDEX_CLIENT_ID"),
  yandexClientSecret: env("YANDEX_CLIENT_SECRET"),
  smtpHost: env("SMTP_HOST"),
  smtpPort: Number(env("SMTP_PORT", "587")),
  smtpUser: env("SMTP_USER"),
  smtpPass: env("SMTP_PASS"),
  smtpFrom: env("SMTP_FROM", "Показо <noreply@pokazo.ru>"),
  openrouterKey: env("OPENROUTER_API_KEY"),
  openrouterBaseUrl: env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  outlineModel: env("LLM_OUTLINE_MODEL", "openai/gpt-4.1-mini"),
  composeModel: env("LLM_COMPOSE_MODEL", "anthropic/claude-sonnet-4.5"),
  llmReferer: env("LLM_HTTP_REFERER", "https://pokazo.ru"),
  llmTitle: env("LLM_APP_TITLE", "Pokazo"),
  deckDataDir: env("DECK_DATA_DIR", "./data/decks"),
  unsplashAccessKey: env("UNSPLASH_ACCESS_KEY"),
};
