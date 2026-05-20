import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { extractAny, type ExtractInput } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cap OCR text passed to the fuzzy-search RPC.
// Noisy pharmacy-bottle OCR (patient name, Rx#, instructions, dosing) explodes
// the trigram candidate set and can blow past the 8s statement timeout.
const MAX_OCR_LEN = 800;

function sanitizeInput(body: unknown): ExtractInput {
  if (typeof body !== "object" || body === null) return {};
  const b = body as Record<string, unknown>;
  const ocrText =
    typeof b.ocrText === "string" ? b.ocrText.slice(0, MAX_OCR_LEN) : undefined;
  const barcodeRaw =
    typeof b.barcodeRaw === "string" ? b.barcodeRaw.slice(0, 256) : undefined;
  const ndc = typeof b.ndc === "string" ? b.ndc.slice(0, 32) : undefined;
  const ocrLines = Array.isArray(b.ocrLines) ? b.ocrLines.slice(0, 200) : undefined;
  return { ocrText, barcodeRaw, ndc, ocrLines: ocrLines as ExtractInput["ocrLines"] };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const input = sanitizeInput(body);
  if (!input.ocrText && !input.barcodeRaw && !input.ndc) {
    return NextResponse.json(
      { error: "provide at least one of: ocrText, barcodeRaw, ndc" },
      { status: 400 },
    );
  }
  try {
    const supabase = getServerSupabase();
    const result = await extractAny(supabase, input);

    // Fire-and-forget log so we can debug extraction failures retroactively.
    void (async () => {
      try {
        await supabase.from("extract_logs").insert({
          source: input.barcodeRaw
            ? "barcode"
            : input.ocrText
              ? "photo"
              : input.ndc
                ? "ndc"
                : null,
          ocr_text: input.ocrText ?? null,
          barcode_raw: input.barcodeRaw ?? null,
          ndc_input: input.ndc ?? null,
          result,
        });
      } catch {
        // ignore
      }
    })();

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
