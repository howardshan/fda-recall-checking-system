import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Bump the body size so multi-photo data URL payloads fit. Defaults are
// stricter on Vercel — fine for local dev; revisit if deploying.
export const maxDuration = 30;

type Body = {
  ocrText?: string;
  photos?: string[]; // data URLs (data:image/jpeg;base64,...)
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const ocrText = typeof body.ocrText === "string" ? body.ocrText : null;
  const photos = Array.isArray(body.photos)
    ? body.photos.filter((p): p is string => typeof p === "string").slice(0, 10)
    : null;

  if (!ocrText && (!photos || photos.length === 0)) {
    return NextResponse.json(
      { error: "ocrText or photos required" },
      { status: 400 },
    );
  }

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase.from("extract_logs").insert({
      source: "photo-upload",
      ocr_text: ocrText,
      photos,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
