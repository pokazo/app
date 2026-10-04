import nodemailer from "nodemailer";
import { config } from "./env.js";

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  if (!config.smtpHost) {
    console.log(`[mail] SMTP unset; magic link for ${email}: ${url}`);
    throw new Error("SMTP is not configured");
  }
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser
      ? { user: config.smtpUser, pass: config.smtpPass }
      : undefined,
  });
  await transporter.sendMail({
    from: config.smtpFrom,
    to: email,
    subject: "Вход в Показо",
    text: `Ссылка для входа (15 минут):\n\n${url}\n`,
    html: `<p>Ссылка для входа (15 минут):</p><p><a href="${url}">${url}</a></p>`,
  });
}
