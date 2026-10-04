import { describe, expect, it } from "vitest";
import { otpEmailContent } from "./mail.js";

describe("otp email", () => {
  it("sends a copy button and no login URL", () => {
    const mail = otpEmailContent("482193", "https://pokazo.ru/copy-code?c=482193");
    expect(mail.subject).toMatch(/код/i);
    expect(mail.html).toContain("Скопировать код");
    expect(mail.html).toContain("https://pokazo.ru/copy-code?c=482193");
    expect(mail.html).toContain("482193");
    expect(mail.html).not.toMatch(/magic-link/i);
    expect(mail.text).toContain("482193");
    expect(mail.text).not.toMatch(/\/api\/auth\//);
  });
});
