import { loadEmailTemplate, renderEmailTemplate } from "./email-template";
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

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; color: #0f172a;">
      <h1 style="color: #0f172a; font-size: 1.25rem;">Your subscription has ended</h1>
      <p>Hi ${args.userName},</p>
      <p>Your paid plan has ended and your account is now on the <strong>Free</strong> plan. You can still sign in and manage up to 2 medications.</p>
      ${refundBlock}
      <p><a href="${appUrl}/pricing" style="color: #f97316;">View plans</a> if you would like to subscribe again.</p>
      <p style="font-size: 0.875rem; color: #475569;">— SafeTrack</p>
    </div>
  `;

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
