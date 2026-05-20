/**
 * Bulk-seed the `recalls` table from OpenFDA's drug enforcement bulk download.
 *
 * Why bulk download (not paginated /drug/enforcement.json):
 *   OpenFDA's search API caps `skip` at 25,000, and the full enforcement set is
 *   significantly larger. The bulk download is the only sanctioned way to get
 *   the full history. We cache downloaded zips under `.cache/openfda/recalls/`
 *   so re-runs can resume without re-downloading.
 *
 * Usage:  npm run seed:recalls
 */
import "./load-env";

import { mkdir, stat } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";

import AdmZip from "adm-zip";
import { createClient } from "@supabase/supabase-js";

import { fetchDownloadIndex, type DownloadPartition } from "../lib/openfda";
import {
  normalizeEnforcementRecord,
  upsertRecallsChunked,
} from "../lib/recalls";
import type { OpenFdaEnforcementRecord, RecallRow } from "../lib/types";

const CACHE_DIR = resolve(process.cwd(), ".cache/openfda/recalls");

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function downloadIfMissing(url: string, destPath: string): Promise<void> {
  if (existsSync(destPath)) {
    const s = await stat(destPath);
    if (s.size > 0) {
      console.log(`  · cached: ${destPath} (${(s.size / 1e6).toFixed(1)} MB)`);
      return;
    }
  }
  console.log(`  · downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`download failed ${res.status} for ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(destPath));
  const s = await stat(destPath);
  console.log(`    → saved ${(s.size / 1e6).toFixed(1)} MB`);
}

function extractRecordsFromZip(zipPath: string): OpenFdaEnforcementRecord[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  if (entries.length === 0) throw new Error(`empty zip: ${zipPath}`);
  // OpenFDA partition zips contain a single JSON file.
  const entry = entries[0];
  const buf = entry.getData();
  const parsed = JSON.parse(buf.toString("utf8")) as {
    results?: OpenFdaEnforcementRecord[];
  };
  return parsed.results ?? [];
}

async function logSyncRunStart(
  supabase: ReturnType<typeof getSupabase>,
  source: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({ source, status: "running" })
    .select("id")
    .single();
  if (error) {
    console.warn(`(non-fatal) failed to log sync_runs start: ${error.message}`);
    return null;
  }
  return data.id as number;
}

async function logSyncRunFinish(
  supabase: ReturnType<typeof getSupabase>,
  id: number | null,
  status: "success" | "error",
  recordsUpserted: number,
  errorMsg?: string,
): Promise<void> {
  if (id == null) return;
  const { error } = await supabase
    .from("sync_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      records_upserted: recordsUpserted,
      error: errorMsg ?? null,
    })
    .eq("id", id);
  if (error) {
    console.warn(`(non-fatal) failed to log sync_runs finish: ${error.message}`);
  }
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const supabase = getSupabase();
  const runId = await logSyncRunStart(supabase, "enforcement-seed");

  try {
    console.log("Fetching OpenFDA download index…");
    const index = await fetchDownloadIndex();
    const partitions = index.results.drug?.enforcement?.partitions ?? [];
    if (partitions.length === 0) {
      throw new Error("no enforcement partitions in download index");
    }
    console.log(`Found ${partitions.length} enforcement partition(s).`);

    let totalRecords = 0;
    let totalUpserted = 0;

    for (const [i, part] of partitions.entries()) {
      const url = part.file;
      const fileName = url.split("/").pop() ?? `partition-${i}.zip`;
      const destPath = resolve(CACHE_DIR, fileName);
      console.log(
        `[${i + 1}/${partitions.length}] ${part.display_name ?? fileName} (~${part.records ?? "?"} records)`,
      );
      await downloadIfMissing(url, destPath);

      const records = extractRecordsFromZip(destPath);
      console.log(`  · parsed ${records.length} records, normalizing…`);
      const rows: RecallRow[] = [];
      for (const r of records) {
        const row = normalizeEnforcementRecord(r);
        if (row) rows.push(row);
      }
      totalRecords += rows.length;
      console.log(`  · upserting ${rows.length} normalized rows…`);
      const upserted = await upsertRecallsChunked(supabase, rows, 500);
      totalUpserted += upserted;
      console.log(`  · partition done. total so far: ${totalUpserted}`);
    }

    await logSyncRunFinish(supabase, runId, "success", totalUpserted);
    console.log(
      `\nDone. normalized=${totalRecords}, upserted=${totalUpserted}, partitions=${partitions.length}.`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSyncRunFinish(supabase, runId, "error", 0, message);
    console.error(`\nSEED FAILED: ${message}`);
    process.exitCode = 1;
  }
}

void main();
