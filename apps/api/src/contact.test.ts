import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_LIMIT,
  allowContact,
  buildContactMail,
  contactClientIp,
  handleContact,
  parseContact,
  resetContactRateLimit,
} from "./contact.js";

const valid = {
  name: "Анна",
  email: "anna@example.com",
  message: "Не открывается готовая презентация.",
  consent: true,
};

describe("parseContact", () => {
  it("accepts a message and builds a reply-to mail", () => {
    const parsed = parseContact({ ...valid, name: "Анна\r\nBcc: x" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.silent) throw new Error("expected message");
    expect(parsed.message.name).toBe("Анна Bcc: x");
    const mail = buildContactMail(parsed.message);
    expect(mail.subject).toBe("Показо: сообщение от Анна Bcc: x");
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.replyTo).toBe("anna@example.com");
    expect(mail.text).toContain("Не открывается готовая презентация.");
  });

  it("rejects missing consent, a bad email, and a short message", () => {
    expect(parseContact({ ...valid, consent: false }).ok).toBe(false);
    expect(parseContact({ ...valid, email: "not-an-email" }).ok).toBe(false);
    expect(parseContact({ ...valid, message: "ок" }).ok).toBe(false);
  });

  it("treats a filled honeypot as a silent success", () => {
    const parsed = parseContact({ ...valid, website: "https://spam.test" });
    expect(parsed).toEqual({ ok: true, silent: true });
  });
});

describe("contact rate limit", () => {
  beforeEach(() => resetContactRateLimit());

  it("uses the last forwarded address and stops after the limit", () => {
    expect(contactClientIp("1.1.1.1, 203.0.113.8")).toBe("203.0.113.8");
    for (let i = 0; i < CONTACT_LIMIT; i++) expect(allowContact("203.0.113.8", 1_000)).toBe(true);
    expect(allowContact("203.0.113.8", 1_000)).toBe(false);
  });
});

describe("handleContact", () => {
  beforeEach(() => resetContactRateLimit());

  it("sends a valid message", async () => {
    const send = vi.fn(async () => {});
    const result = await handleContact({
      body: valid,
      forwardedFor: "198.51.100.10",
      send,
    });
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      replyTo: "anna@example.com",
      subject: "Показо: сообщение от Анна",
    });
  });

  it("does not send when the honeypot is filled", async () => {
    const send = vi.fn(async () => {});
    const result = await handleContact({
      body: { ...valid, website: "bot" },
      forwardedFor: undefined,
      send,
    });
    expect(result.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty body and 429 after the limit", async () => {
    const send = vi.fn(async () => {});
    const bad = await handleContact({ body: {}, forwardedFor: undefined, send });
    expect(bad.status).toBe(400);

    for (let i = 0; i < CONTACT_LIMIT; i++) {
      const res = await handleContact({
        body: valid,
        forwardedFor: "198.51.100.20",
        send,
      });
      expect(res.status).toBe(200);
    }
    const limited = await handleContact({
      body: valid,
      forwardedFor: "198.51.100.20",
      send,
    });
    expect(limited.status).toBe(429);
    expect(send).toHaveBeenCalledTimes(CONTACT_LIMIT);
  });

  it("returns 503 when mail delivery fails", async () => {
    const send = vi.fn(async () => {
      throw new Error("SMTP is not configured");
    });
    const result = await handleContact({
      body: valid,
      forwardedFor: "198.51.100.30",
      send,
    });
    expect(result).toEqual({
      status: 503,
      body: { error: "Не получилось отправить. Попробуйте ещё раз." },
    });
  });
});
