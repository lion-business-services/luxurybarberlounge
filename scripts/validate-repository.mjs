import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory, predicate) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "coverage", "out"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...(await walk(full, predicate)));
    else if (!predicate || predicate(full)) results.push(full);
  }
  return results;
}

const requiredFiles = [
  "README.md",
  "CLAUDE.md",
  ".env.example",
  "src/proxy.ts",
  "src/lib/content/site.ts",
  "src/lib/supabase/client.ts",
  "src/lib/supabase/admin.ts",
  "src/lib/supabase/database.types.ts",
  "src/lib/square/client.ts",
  "src/lib/booking/provider.ts",
  "src/lib/attribution/engine.ts",
  "src/lib/commissions/engine.ts",
  "src/lib/queue/engine.ts",
  "src/lib/automation/engine.ts",
  "supabase/seed/seed.sql",
  "docs/implementation-report.md",
  "docs/launch/production-checklist.md",
];
for (const file of requiredFiles) assert.ok(await exists(file), `Missing required file: ${file}`);

const routeFiles = await walk("src/app", (file) => file.endsWith("page.tsx") || file.endsWith("page.ts"));
assert.ok(routeFiles.length >= 100, `Expected comprehensive route coverage, found ${routeFiles.length}`);
for (const segment of ["admin", "client", "barber", "reception", "services", "barbers", "book", "walk-ins"]) {
  assert.ok(
    routeFiles.some(
      (file) => file.includes(`${path.sep}${segment}${path.sep}`) || file.endsWith(`${path.sep}${segment}${path.sep}page.tsx`),
    ),
    `Missing route group: ${segment}`,
  );
}

const migrations = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort();
assert.ok(migrations.length >= 6, `Expected ordered migration coverage, found ${migrations.length}`);
for (const migration of migrations) {
  const sql = await readFile(path.join("supabase/migrations", migration), "utf8");
  assert.ok(sql.trim().length > 100, `Migration appears incomplete: ${migration}`);
}

const sourceFiles = await walk("src", (file) => /\.(?:ts|tsx|js|mjs)$/.test(file));
for (const file of sourceFiles) {
  const content = await readFile(file, "utf8");
  assert.ok(!/href\s*=\s*["']#["']/.test(content), `Dead href found in ${file}`);
  assert.ok(!/Barber\s+(?:One|Two|Three|Four|Five)/i.test(content), `Placeholder barber identity found in ${file}`);
  assert.ok(!/\b(?:TBA|to be announced|Lorem Ipsum)\b/i.test(content), `Public placeholder language found in ${file}`);
}

const env = await readFile(".env.example", "utf8");
for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_WEBHOOK_SIGNATURE_KEY",
  "AI_PROVIDER_API_KEY",
]) {
  assert.ok(env.includes(`${name}=`), `Missing environment template entry: ${name}`);
}

const features = await readFile("src/lib/config/features.ts", "utf8");
assert.ok(features.includes("NEXT_PUBLIC_PORTAL_DEMO_MODE"), "Portal demo mode must be feature-controlled.");
assert.ok(features.includes("NEXT_PUBLIC_FEATURE_WALK_IN_QUEUE"), "Walk-in queue must be feature-controlled.");

console.log(
  `Repository validation passed: ${routeFiles.length} pages, ${migrations.length} migrations, ${sourceFiles.length} source files.`,
);
