import { NextResponse } from "next/server";
import { getMeta } from "@/lib/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const meta = await getMeta();
  return NextResponse.json(meta);
}
