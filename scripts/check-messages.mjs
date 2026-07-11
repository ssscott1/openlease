// Verifies every locale file has exactly the same keys as en.json
// (ignoring the _meta marker) and that ICU placeholders match.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "messages");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
const load = (f) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === "_meta") continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const en = flatten(load("en.json"));
let failed = false;

for (const file of files) {
  if (file === "en.json") continue;
  const other = flatten(load(file));
  const missing = Object.keys(en).filter((k) => !(k in other));
  const extra = Object.keys(other).filter((k) => !(k in en));
  const phMismatch = Object.keys(en).filter(
    (k) => k in other && placeholders(en[k]) !== placeholders(other[k]),
  );
  if (missing.length || extra.length || phMismatch.length) {
    failed = true;
    console.error(`✗ ${file}`);
    for (const k of missing) console.error(`  missing: ${k}`);
    for (const k of extra) console.error(`  extra:   ${k}`);
    for (const k of phMismatch) console.error(`  placeholder mismatch: ${k}`);
  } else {
    console.log(`✓ ${file} (${Object.keys(other).length} keys)`);
  }
}

process.exit(failed ? 1 : 0);
