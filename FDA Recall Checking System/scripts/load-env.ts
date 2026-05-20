/**
 * Loads environment variables from .env.local (preferred) or .env into process.env.
 * Required for scripts run directly via tsx (Next.js auto-loads these, but tsx does not).
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const cwd = process.cwd();
const candidates = [".env.local", ".env"];
for (const name of candidates) {
  const path = resolve(cwd, name);
  if (existsSync(path)) {
    config({ path, override: false });
  }
}
