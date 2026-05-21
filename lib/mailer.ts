import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP_HOST / SMTP_USER / SMTP_PASS env vars");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export async function sendEmail(args: SendEmailArgs): Promise<void> {
  const from =
    args.from ??
    process.env.SMTP_FROM ??
    process.env.SMTP_USER ??
    "noreply@example.com";
  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
}

/**
 * Fire-and-forget variant that logs but never throws.
 * Use when mail failures should not break the calling request flow
 * (e.g. recall notification dispatch from inside the sync cron).
 */
export async function sendEmailQuietly(args: SendEmailArgs): Promise<boolean> {
  try {
    await sendEmail(args);
    return true;
  } catch (err) {
    console.error("[mailer] send failed:", err);
    return false;
  }
}
