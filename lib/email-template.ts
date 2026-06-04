import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, string>();

export function loadEmailTemplate(filename: string): string {
  const cached = cache.get(filename);
  if (cached) return cached;
  const contents = readFileSync(join(process.cwd(), "emails", filename), "utf-8");
  cache.set(filename, contents);
  return contents;
}

export function renderEmailTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  out = out.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, name, body) =>
    vars[name] ? body : "",
  );
  out = out.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? "");
  return out;
}
