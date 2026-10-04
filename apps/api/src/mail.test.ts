import { describe, expect, it } from "vitest";
import { otpEmailContent } from "./mail.js";

describe("otp email", () => {
  it("uses Gmail OTP subject and no magic-link URL", () => {
    const mail = otpEmailContent("482193");
    expect(mail.subject).toBe("482193 is your verification code");
    expect(mail.html).toContain("482193 is your verification code");
    expect(mail.html).toContain("482193");
    expect(mail.html).not.toMatch(/magic-link/i);
    expect(mail.text.startsWith("482193 is your verification code")).toBe(true);
    expect(mail.text).not.toMatch(/\/api\/auth\//);
  });
});
