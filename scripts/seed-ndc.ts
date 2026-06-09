/**
 * Bulk-seed the `ndc_products` dictionary from OpenFDA's NDC bulk download.
 *
 * Why TRUNCATE + INSERT (not upsert): ndc_products has no natural unique key
 * we can rely on across releases (FDA reuses NDC numbers when products are
 * discontinued + re-registered). The full dictionary is small enough to wipe
 * and reload per run.
 *
 * Usage:  npm run seed:ndc
 */
import "./load-env";

import { mkdir, stat } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";

import AdmZip from "adm-zip";
import { createClient } from "@supabase/supabase-js";

import { fetchDownloadIndex } from "../lib/openfda";
import { insertNdcChunked, normalizeNdcRecord } from "../lib/ndc";
import type { NdcProductRow, OpenFdaNdcRecord } from "../lib/types";

const CACHE_DIR = resolve(process.cwd(), ".cache/openfda/ndc");

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

function extractRecordsFromZip(zipPath: string): OpenFdaNdcRecord[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  if (entries.length === 0) throw new Error(`empty zip: ${zipPath}`);
  const entry = entries[0];
  const buf = entry.getData();
  const parsed = JSON.parse(buf.toString("utf8")) as {
    results?: OpenFdaNdcRecord[];
  };
  return parsed.results ?? [];
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const supabase = getSupabase();

  const { data: started, error: startedErr } = await supabase
    .from("sync_runs")
    .insert({ source: "ndc-seed", status: "running" })
    .select("id")
    .single();
  if (startedErr) {
    console.warn(`(non-fatal) failed to write sync_runs start: ${startedErr.message}`);
  }
  const runId = (started?.id as number | undefined) ?? null;

  try {
    console.log("Fetching OpenFDA download index…");
    const index = await fetchDownloadIndex();
    const partitions = index.results.drug?.ndc?.partitions ?? [];
    if (partitions.length === 0) {
      throw new Error("no NDC partitions in download index");
    }
    console.log(`Found ${partitions.length} NDC partition(s).`);

    console.log("Truncating ndc_products…");
    const { error: truncErr } = await supabase.rpc("truncate_ndc_products");
    if (truncErr) {
      console.warn(
        `(non-fatal) truncate_ndc_products RPC unavailable; falling back to delete: ${truncErr.message}`,
      );
      const { error: delErr } = await supabase
        .from("ndc_products")
        .delete()
        .gte("id", 0);
      if (delErr) {
        console.warn(
          `(non-fatal) delete also failed; will append. Existing rows remain: ${delErr.message}`,
        );
      } else {
        console.log("  · cleared via delete.");
      }
    } else {
      console.log("  · truncated.");
    }

    let totalInserted = 0;

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
      const rows: NdcProductRow[] = [];
      for (const r of records) {
        const row = normalizeNdcRecord(r);
        if (row) rows.push(row);
      }
      console.log(`  · inserting ${rows.length} rows…`);
      const inserted = await insertNdcChunked(supabase, rows, 200);
      totalInserted += inserted;
      console.log(`  · partition done. total so far: ${totalInserted}`);
    }

    if (runId != null) {
      await supabase
        .from("sync_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          records_upserted: totalInserted,
        })
        .eq("id", runId);
    }
    console.log(`\nDone. inserted=${totalInserted}, partitions=${partitions.length}.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId != null) {
      await supabase
        .from("sync_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error: message,
        })
        .eq("id", runId);
    }
    console.error(`\nSEED FAILED: ${message}`);
    process.exitCode = 1;
  }
}

void main();
