const WINDOW_MS = 60 * 60 * 1000;
export const CONTACT_LIMIT = 5;

/** local@domain.tld — same source as the contact form `pattern`. */
export const REPLY_EMAIL_PATTERN =
  String.raw`[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}`;
const REPLY_EMAIL = new RegExp(`^${REPLY_EMAIL_PATTERN}$`);
export const REPLY_EMAIL_ERROR = "Почта для ответа должна быть вида name@example.com.";

export function isReplyEmail(value: string): boolean {
  const email = value.trim();
  return email.length > 0 && email.length <= 120 && REPLY_EMAIL.test(email);
}
const buckets = new Map<string, number[]>();

export type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

export type ContactParse =
  | { ok: true; silent: true }
  | { ok: true; silent: false; message: ContactMessage }
  | { ok: false; error: string };

export function resetContactRateLimit(): void {
  buckets.clear();
}

/** Last hop of X-Forwarded-For is the address nginx appended. */
export function contactClientIp(forwardedFor: string | undefined): string {
  const parts = (forwardedFor ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const ip = parts.at(-1) ?? "";
  return ip.slice(0, 64) || "unknown";
}

export function allowContact(ip: string, now = Date.now()): boolean {
  if (buckets.size > 2000) buckets.clear();
  const recent = (buckets.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= CONTACT_LIMIT) {
    buckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  buckets.set(ip, recent);
  return true;
}

function oneLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseContact(body: unknown): ContactParse {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Некорректный запрос." };
  }
  const raw = body as Record<string, unknown>;
  if (typeof raw.website === "string" && raw.website.trim()) {
    return { ok: true, silent: true };
  }
  if (raw.consent !== true) {
    return { ok: false, error: "Нужно согласие на обработку персональных данных." };
  }
  const name = oneLine(raw.name, 80);
  const email = oneLine(raw.email, 120).toLowerCase();
  const message = typeof raw.message === "string" ? raw.message.replace(/\r\n/g, "\n").trim() : "";
  if (!isReplyEmail(email)) {
    return { ok: false, error: REPLY_EMAIL_ERROR };
  }
  if (message.length < 5) {
    return { ok: false, error: "Напишите сообщение — хотя бы пару слов." };
  }
  if (message.length > 4000) {
    return { ok: false, error: "Сообщение слишком длинное." };
  }
  return { ok: true, silent: false, message: { name, email, message } };
}

export type ContactMail = {
  subject: string;
  text: string;
  replyTo: string;
};

export async function handleContact(opts: {
  body: unknown;
  forwardedFor: string | undefined;
  send: (mail: ContactMail) => Promise<void>;
}): Promise<{ status: 200 | 400 | 429 | 503; body: { ok: true } | { error: string } }> {
  const parsed = parseContact(opts.body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  if (parsed.silent) return { status: 200, body: { ok: true } };
  const ip = contactClientIp(opts.forwardedFor);
  if (!allowContact(ip)) {
    return { status: 429, body: { error: "Слишком много сообщений. Напишите позже." } };
  }
  try {
    await opts.send(buildContactMail(parsed.message));
  } catch (err) {
    console.error("[contact] send failed", err instanceof Error ? err.message : "error");
    return { status: 503, body: { error: "Не получилось отправить. Попробуйте ещё раз." } };
  }
  return { status: 200, body: { ok: true } };
}

export function buildContactMail(message: ContactMessage): ContactMail {
  const who = message.name || message.email;
  const text = [
    ...(message.name ? [`Имя: ${message.name}`] : []),
    `Почта: ${message.email}`,
    "",
    message.message,
  ].join("\n");
  return {
    subject: `Показо: сообщение от ${who}`,
    text,
    replyTo: message.email,
  };
}
