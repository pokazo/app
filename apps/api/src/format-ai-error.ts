/** Max length for deck.error / rewrite.json / logs. */
export const AI_ERROR_MAX_LEN = 2000;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Prefer provider response body / status over bare `AI_APICallError: Provider returned error`.
 * Works with AI SDK `APICallError` and plain Errors.
 */
export function formatAiError(err: unknown, maxLen = AI_ERROR_MAX_LEN): string {
  if (err == null) return "unknown error";
  if (typeof err === "string") return truncate(err.trim() || "unknown error", maxLen);

  const r = asRecord(err);
  const message =
    err instanceof Error
      ? err.message
      : typeof r?.message === "string"
        ? r.message
        : String(err);

  const name =
    err instanceof Error
      ? err.name
      : typeof r?.name === "string"
        ? r.name
        : "Error";

  const statusCode =
    typeof r?.statusCode === "number"
      ? r.statusCode
      : typeof r?.status === "number"
        ? r.status
        : null;

  const url = typeof r?.url === "string" ? r.url : null;

  let body: string | null = null;
  if (typeof r?.responseBody === "string" && r.responseBody.trim()) {
    body = r.responseBody.trim();
  } else if (r?.data != null) {
    try {
      body = JSON.stringify(r.data);
    } catch {
      body = String(r.data);
    }
  }

  // OpenRouter / OpenAI often nest `{ error: { message } }` in body or data.
  let providerMsg: string | null = null;
  if (body) {
    try {
      const parsed = JSON.parse(body) as unknown;
      const pe = asRecord(parsed)?.error;
      if (typeof pe === "string") providerMsg = pe;
      else if (asRecord(pe)?.message && typeof asRecord(pe)!.message === "string") {
        providerMsg = asRecord(pe)!.message as string;
      }
    } catch {
      /* body is not JSON */
    }
  }

  const geminiSchemaReject =
    statusCode === 400 &&
    (body?.includes("INVALID_ARGUMENT") ?? false) &&
    (body?.includes("Google AI Studio") ?? false);

  const parts: string[] = [`${name}: ${message}`];
  if (statusCode != null) parts.push(`status=${statusCode}`);
  if (geminiSchemaReject) {
    parts.push(
      "Gemini отклонил JSON Schema (часто maxItems). Outline fallback должен использовать gemini-json-schema; если видите это после деплоя — проверьте LLM_OUTLINE_MODEL.",
    );
  }
  if (providerMsg && providerMsg !== message) parts.push(providerMsg);
  if (body) parts.push(`body=${body}`);
  if (url) {
    try {
      const u = new URL(url);
      parts.push(`url=${u.pathname}`);
    } catch {
      parts.push(`url=${url.slice(0, 120)}`);
    }
  }

  return truncate(parts.join(" | "), maxLen);
}

/** Log once with structured fields for docker grep. */
export function logAiError(scope: string, err: unknown, extra?: Record<string, unknown>): void {
  const r = asRecord(err);
  const formatted = formatAiError(err);
  console.error(`[${scope}] ${formatted}`, {
    statusCode: typeof r?.statusCode === "number" ? r.statusCode : undefined,
    url: typeof r?.url === "string" ? r.url : undefined,
    responseBody:
      typeof r?.responseBody === "string" ? truncate(r.responseBody, 1500) : undefined,
    ...extra,
  });
}
