import twilio from "twilio";
import type { Twilio } from "twilio";

let cached: Twilio | null = null;

function getClient(): Twilio | null {
  if (cached) return cached;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  cached = twilio(sid, token);
  return cached;
}

export type SendSmsArgs = {
  to: string;
  body: string;
};

/**
 * Send an SMS via Twilio. Returns true on success. Failures are logged but
 * never thrown — callers treat SMS as best-effort delivery alongside email.
 */
export async function sendSmsQuietly(args: SendSmsArgs): Promise<boolean> {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    console.error("[sms] TWILIO_FROM_NUMBER not set; skipping send");
    return false;
  }
  const client = getClient();
  if (!client) {
    console.error("[sms] Twilio credentials not set; skipping send");
    return false;
  }
  try {
    await client.messages.create({
      from,
      to: args.to,
      body: args.body,
    });
    return true;
  } catch (err) {
    console.error("[sms] send failed:", err);
    return false;
  }
}
