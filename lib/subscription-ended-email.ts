import { sendEmailQuietly } from "./mailer";
import { appBaseUrl } from "./stripe";

function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export async function sendSubscriptionEndedEmail(args: {
  to: string;
  userName: string;
  refundAmountCents?: number | null;
  currency?: string;
}): Promise<boolean> {
  const appUrl = appBaseUrl();
  const refundBlock =
    args.refundAmountCents != null && args.refundAmountCents > 0
      ? `<p>We refunded <strong>${formatMoney(args.refundAmountCents, args.currency ?? "usd")}</strong> of unused account credit to your original payment method. Banks typically post refunds within 5–10 business days.</p>`
      : "";

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; color: #001f2a;">
      <h1 style="color: #00342b; font-size: 1.25rem;">Your subscription has ended</h1>
      <p>Hi ${args.userName},</p>
      <p>Your paid plan has ended and your account is now on the <strong>Free</strong> plan. You can still sign in and manage up to 2 medications.</p>
      ${refundBlock}
      <p><a href="${appUrl}/pricing" style="color: #822800;">View plans</a> if you would like to subscribe again.</p>
      <p style="font-size: 0.875rem; color: #44443f;">— SafeTrack</p>
    </div>
  `;

  const textLines = [
    `Hi ${args.userName},`,
    "",
    "Your paid plan has ended and your account is now on the Free plan.",
  ];
  if (args.refundAmountCents != null && args.refundAmountCents > 0) {
    textLines.push(
      "",
      `We refunded ${formatMoney(args.refundAmountCents, args.currency ?? "usd")} of unused account credit to your original payment method.`,
    );
  }
  textLines.push("", `Plans: ${appUrl}/pricing`, "", "— SafeTrack");

  return sendEmailQuietly({
    to: args.to,
    subject: "Your SafeTrack subscription has ended",
    html,
    text: textLines.join("\n"),
  });
}
