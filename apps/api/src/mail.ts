import nodemailer from "nodemailer";
import { config } from "./env.js";

const OTP_MINUTES = 15;

export function otpEmailContent(otp: string, copyUrl: string): { subject: string; text: string; html: string } {
  const subject = "Код входа в Показо";
  const text = `Код для входа (${OTP_MINUTES} минут): ${otp}\n\nСкопировать: ${copyUrl}\n`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f5fb;font-family:Arial,sans-serif;color:#0f1220;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:440px;margin:0 auto;background:#ffffff;border:1px solid #e6e1f0;border-radius:16px;padding:28px;">
    <tr><td style="text-align:center;font-size:14px;color:#5b6178;">Код для входа · ${OTP_MINUTES} минут</td></tr>
    <tr><td style="text-align:center;padding:18px 0 8px;font-size:36px;letter-spacing:8px;font-weight:700;font-family:ui-monospace,Menlo,Consolas,monospace;">${otp}</td></tr>
    <tr><td style="text-align:center;padding:16px 0 8px;">
      <a href="${copyUrl}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:16px;font-weight:600;">Скопировать код</a>
    </td></tr>
    <tr><td style="text-align:center;padding-top:12px;font-size:13px;color:#5b6178;">Вставь код на странице входа. Ссылку для входа не отправляем.</td></tr>
  </table>
</body></html>`;
  return { subject, text, html };
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const copyUrl = `${config.appOrigin.replace(/\/$/, "")}/copy-code?c=${encodeURIComponent(otp)}`;
  const body = otpEmailContent(otp, copyUrl);
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
