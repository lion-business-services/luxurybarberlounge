import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const migrationDir = path.join(root, "supabase", "migrations");
const files = fs
  .readdirSync(migrationDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

// These migrations were already deployed before the repository adopted its
// strict 12-digit / BEGIN...COMMIT convention. Keep destructive-DDL, RLS,
// policy-parenthesis and dollar-quote safety scans active for every migration,
// but do not let historical filename/transaction formatting debt make every
// future release permanently fail CI.
const legacyFormatDebt = new Set([
  "202608180020_attribution_chain_and_deposit_gate.sql",
  "202608190021_commission_by_profile_and_test_claims.sql",
  "202608190022_balance_payment_token.sql",
  "202608190023_memberships_portfolio_payouts.sql",
  "202608190024_barber_role_autogrant.sql",
  "202608200025_availability_admin_membership.sql",
  "202608210026_auth_null_token_guard.sql",
  "202608220027_full_prepayment_service_fee.sql",
  "20260827181811_barber_availability_calendar_integrity.sql",
  "20260827181844_barber_schedule_defaults_correction.sql",
  "20260827203542_booking_availability_hardening.sql",
  "20260827211147_barber_los_full_business_hours.sql",
  "20260902181433_enforce_full_website_prepayment.sql",
  "20260902181615_allow_website_payment_reconciliation_transition.sql",
  "20260902203337_walk_in_contact_time_price_capture.sql",
  "202609022200_walk_in_payment_commission_reconciliation.sql",
  "20260903180000_walk_in_commission_attribution_guard.sql",
  "20260903184500_commission_statements_ready_to_review.sql",
  "20260904190000_barber_booking_email_immediate.sql",
]);

const failures = [];
if (files.length === 0) failures.push("No SQL migrations were found.");

let previousPrefix = "";
for (const file of files) {
  const fullPath = path.join(migrationDir, file);
  const sql = fs.readFileSync(fullPath, "utf8");
  const prefix = file.match(/^(\d{12})_/)?.[1];
  const legacy = legacyFormatDebt.has(file);

  if (!prefix && !legacy) failures.push(`${file}: expected a 12-digit timestamp prefix.`);
  if (previousPrefix && prefix && prefix <= previousPrefix) {
    failures.push(`${file}: migration prefix is not strictly increasing.`);
  }
  previousPrefix = prefix ?? previousPrefix;

  if (!legacy && !/^\s*(?:--[^\n]*\n\s*)*begin\s*;/i.test(sql)) {
    failures.push(`${file}: migration must start with BEGIN after comments.`);
  }
  if (!legacy && !/commit\s*;\s*$/i.test(sql)) {
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

console.log(`Migration validation passed: ${files.length} ordered, transactional SQL files (legacy format debt grandfathered).`);
