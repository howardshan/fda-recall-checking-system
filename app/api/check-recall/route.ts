import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { getServerAuthSupabase } from "@/lib/auth";
import {
  checkRecall,
  getLastSyncedAt,
  logQuery,
  type CheckRecallInput,
} from "@/lib/check-recall";
import {
  QUICK_CHECK_LIMIT,
  readQuotaFromCookies,
  setQuotaCookie,
} from "@/lib/quick-check-quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(body: unknown): CheckRecallInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const productName = typeof b.productName === "string" ? b.productName.slice(0, 200) : "";
  if (!productName.trim() && !(typeof b.ndc === "string" && b.ndc.trim())) {
    return null;
  }
  return {
    productName,
    manufacturer: typeof b.manufacturer === "string" ? b.manufacturer.slice(0, 200) : null,
    ndc: typeof b.ndc === "string" ? b.ndc.slice(0, 32) : null,
    lotNumber: typeof b.lotNumber === "string" ? b.lotNumber.slice(0, 32) : null,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const input = sanitize(body);
  if (!input) {
    return NextResponse.json(
      { error: "productName or ndc is required" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const inputMethod = (url.searchParams.get("inputMethod") as
    | "manual"
    | "photo"
    | "barcode"
    | null) ?? "manual";

  // Anonymous quota: authenticated users bypass; everyone else gets
  // QUICK_CHECK_LIMIT free checks per device (cookie). Cookie counts
  // successful responses only — failed requests don't burn quota.
  const authSupabase = await getServerAuthSupabase();
  const { data: userData } = await authSupabase.auth.getUser();
  const isAuthed = !!userData.user;
  const usedBefore = isAuthed ? 0 : readQuotaFromCookies(req.headers.get("cookie"));

  if (!isAuthed && usedBefore >= QUICK_CHECK_LIMIT) {
    const limited = NextResponse.json(
      {
        error: "login_required",
        message: `Free quick checks limited to ${QUICK_CHECK_LIMIT} per device. Sign in or create a free account to keep checking.`,
        quota: { used: usedBefore, limit: QUICK_CHECK_LIMIT },
      },
      { status: 401 },
    );
    return limited;
  }

  try {
    const supabase = getServerSupabase();
    const [result, lastSyncedAt] = await Promise.all([
      checkRecall(supabase, input),
      getLastSyncedAt(supabase),
    ]);

    // Fire-and-forget log; do not block response.
    void logQuery(supabase, input, result.status, inputMethod).catch(() => undefined);

    const usedAfter = isAuthed ? usedBefore : usedBefore + 1;
    const response = NextResponse.json({
      ...result,
      lastSyncedAt,
      quota: isAuthed
        ? { unlimited: true }
        : { used: usedAfter, limit: QUICK_CHECK_LIMIT },
    });
    if (!isAuthed) setQuotaCookie(response, usedAfter);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
