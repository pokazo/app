import nodemailer from "nodemailer";
import { config } from "./env.js";

const OTP_MINUTES = 15;

export function otpEmailContent(otp: string): { subject: string; text: string; html: string } {
  // Gmail native OTP card ("Copy code") matches this subject, same as OpenRouter.
  const subject = `${otp} is your verification code`;
  const text = `${otp} is your verification code\n\nКод для входа в Показо (${OTP_MINUTES} минут): ${otp}\n`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f5fb;font-family:Arial,sans-serif;color:#0f1220;">
  <p style="font-size:14px;color:#5b6178;margin:0 0 16px;">${otp} is your verification code</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:440px;margin:0 auto;background:#ffffff;border:1px solid #e6e1f0;border-radius:16px;padding:28px;">
    <tr><td style="text-align:center;font-size:14px;color:#5b6178;">Код для входа в Показо · ${OTP_MINUTES} минут</td></tr>
    <tr><td style="text-align:center;padding:18px 0 8px;font-size:36px;letter-spacing:8px;font-weight:700;font-family:ui-monospace,Menlo,Consolas,monospace;">${otp}</td></tr>
  </table>
</body></html>`;
  return { subject, text, html };
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const body = otpEmailContent(otp);
  if (!config.smtpHost) {
    console.log(`[mail] SMTP unset; OTP for ${email}: ${otp}`);
    throw new Error("SMTP is not configured");
  }
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });
  await transporter.sendMail({
    from: config.smtpFrom,
    to: email,
    ...body,
  });
}
