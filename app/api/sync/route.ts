import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_LOOKBACK_DAYS = 30;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const lookbackParam = url.searchParams.get("lookbackDays");
  const lookbackDays = lookbackParam
    ? Math.max(1, Math.min(365, Number.parseInt(lookbackParam, 10) || DEFAULT_LOOKBACK_DAYS))
    : DEFAULT_LOOKBACK_DAYS;
  try {
    const result = await runSync(lookbackDays);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel Cron sends GET. Accept both verbs.
export async function GET(req: Request) {
  return POST(req);
}
