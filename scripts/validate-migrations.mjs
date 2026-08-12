import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const migrationDir = path.join(root, "supabase", "migrations");
const files = fs
  .readdirSync(migrationDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const failures = [];
if (files.length === 0) failures.push("No SQL migrations were found.");

let previousPrefix = "";
for (const file of files) {
  const fullPath = path.join(migrationDir, file);
  const sql = fs.readFileSync(fullPath, "utf8");
  const prefix = file.match(/^(\d{12})_/)?.[1];

  if (!prefix) failures.push(`${file}: expected a 12-digit timestamp prefix.`);
  if (previousPrefix && prefix && prefix <= previousPrefix) {
    failures.push(`${file}: migration prefix is not strictly increasing.`);
  }
  previousPrefix = prefix ?? previousPrefix;

  if (!/^\s*(?:--[^\n]*\n\s*)*begin\s*;/i.test(sql)) {
    failures.push(`${file}: migration must start with BEGIN after comments.`);
  }
  if (!/commit\s*;\s*$/i.test(sql)) {
    failures.push(`${file}: migration must end with COMMIT.`);
  }
  // Migration 011 safely replaces two empty legacy placeholders. Each dynamic DROP is
  // guarded by an explicit data check that raises before destruction. Keep the general
  // destructive-DDL guard strict while allowing only those two audited replacements.
  const destructiveScanSql = sql.replace(
    /execute\s+'drop\s+table\s+public\.(?:appointment_assignments|barber_time_off)'\s*;/gi,
    "",
  );
  if (/\b(drop\s+table|truncate\s+table)\b/i.test(destructiveScanSql)) {
    failures.push(`${file}: destructive DROP TABLE or TRUNCATE statement detected.`);
  }
  if (/alter\s+table\s+storage\.objects\s+enable\s+row\s+level\s+security/i.test(sql)) {
    failures.push(`${file}: must not alter Supabase-managed storage.objects RLS state.`);
  }

  const lines = sql.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*create\s+policy\b/i.test(lines[index])) continue;
    const startLine = index + 1;
    let statement = lines[index];
    while (!/;\s*(?:--.*)?$/.test(statement) && index + 1 < lines.length) {
      index += 1;
      statement += `\n${lines[index]}`;
    }
    const opens = (statement.match(/\(/g) ?? []).length;
    const closes = (statement.match(/\)/g) ?? []).length;
    if (opens !== closes) failures.push(`${file}:${startLine}: unbalanced CREATE POLICY parentheses.`);
  }

  const dollarTags = [...sql.matchAll(/\$[A-Za-z0-9_]*\$/g)].map((match) => match[0]);
  const tagCounts = new Map();
  for (const tag of dollarTags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  for (const [tag, count] of tagCounts) {
    if (count % 2 !== 0) failures.push(`${file}: unmatched PostgreSQL dollar quote ${tag}.`);
  }
}

const foundation = fs.readFileSync(path.join(migrationDir, files[0] ?? ""), "utf8");
if (files.length > 0) {
  if (!/create\s+table\s+if\s+not\s+exists\s+public\.user_roles\s*\([\s\S]*?\bid\s+uuid\s+primary\s+key/i.test(foundation)) {
    failures.push("Foundation migration must give user_roles an independent UUID primary key.");
  }
  if (!/user_roles_(?:global|null_scope)_unique/i.test(foundation)) {
    failures.push("Foundation migration is missing the global user-role uniqueness index.");
  }
}

const rlsFile = files.find((file) => /rls|storage/i.test(file));
if (!rlsFile) {
  failures.push("No RLS/storage migration was found.");
} else {
  const rlsSql = fs.readFileSync(path.join(migrationDir, rlsFile), "utf8");
  if (!/enable\s+row\s+level\s+security/i.test(rlsSql)) {
    failures.push(`${rlsFile}: no application-table RLS enablement was found.`);
  }
  if (!/storage\.objects/i.test(rlsSql) || !/create\s+policy/i.test(rlsSql)) {
    failures.push(`${rlsFile}: storage access policies were not found.`);
  }
}

if (failures.length > 0) {
  console.error("Migration validation failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Migration validation passed: ${files.length} ordered, transactional SQL files.`);
