import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sendEmailQuietly } from "./mailer";
import { appBaseUrl } from "./stripe";

function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let cachedTemplate: string | null = null;

async function loadTemplate(): Promise<string> {
  if (cachedTemplate) return cachedTemplate;
  const path = join(process.cwd(), "emails", "subscription-ended.html");
  cachedTemplate = await readFile(path, "utf-8");
  return cachedTemplate;
}

function render(template: string, vars: Record<string, string>): string {
  let out = template;
  out = out.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, name, body) =>
    vars[name] ? body : "",
  );
  out = out.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? "");
  return out;
}

export async function sendSubscriptionEndedEmail(args: {
  to: string;
  userName: string;
  refundAmountCents?: number | null;
  currency?: string;
}): Promise<boolean> {
  const appUrl = appBaseUrl();
  const hasRefund =
    args.refundAmountCents != null && args.refundAmountCents > 0 ? "1" : "";
  const refundFormatted =
    hasRefund && args.refundAmountCents != null
      ? formatMoney(args.refundAmountCents, args.currency ?? "usd")
      : "";

  const template = await loadTemplate();
  const html = render(template, {
    userName: escHtml(args.userName),
    appUrl,
    hasRefund,
    refundAmountFormatted: refundFormatted,
  });

  const textLines = [
    `Hi ${args.userName},`,
    "",
    "Your SafeTrack paid plan has ended. Your account is now on the Free plan.",
    "",
    "On Free you can:",
    "• Track up to 2 medications with active recall monitoring",
    "• Receive in-app alerts and daily digest email",
    "• Extra saved medications are paused until you upgrade",
  ];
  if (hasRefund) {
    textLines.push(
      "",
      `Refund: ${refundFormatted} of unused account credit was sent to your original payment method (typically 5–10 business days).`,
    );
  }
  textLines.push(
    "",
    `View plans: ${appUrl}/pricing`,
    `Medicine cabinet: ${appUrl}/cabinet`,
    "",
    "— SafeTrack",
  );

  return sendEmailQuietly({
    to: args.to,
    subject: "Your SafeTrack subscription has ended",
    html,
    text: textLines.join("\n"),
  });
}
