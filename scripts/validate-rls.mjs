import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "supabase", "migrations");
const files = fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
const sql = files.map((file) => fs.readFileSync(path.join(dir, file), "utf8")).join("\n");
const failures = [];
const privateTables = [
  "profiles", "user_roles", "client_profiles", "staff_profiles", "booking_metadata",
  "queue_entries", "square_orders", "memberships", "notification_jobs", "audit_logs",
  "client_history_events", "privacy_requests", "order_extensions", "membership_requests",
];
function hasRls(table) {
  const direct = new RegExp(`alter table public\\.${table} enable row level security`, "i").test(sql);
  const dynamicArray = new RegExp(`[\\'\"]${table}[\\'\"]`).test(sql) && /EXECUTE format\('alter table public\.%I enable row level security'/i.test(sql);
  return direct || dynamicArray;
}
for (const table of privateTables) if (!hasRls(table)) failures.push(`${table}: RLS is not enabled.`);
for (const required of [
  "profiles_self_read", "user_roles_self_read", "booking_metadata_client_read", "queue_client_read",
  "square_orders_client_read", "memberships_client_read", "profiles_operational_staff_read",
  "privacy_requests_self_read", "membership_requests_self_read",
]) {
  if (!new RegExp(`create policy ${required}\\b`, "i").test(sql)) failures.push(`Missing policy: ${required}`);
}
const env = fs.readFileSync(".env.example", "utf8");
if (!/SUPABASE_SERVICE_ROLE_KEY=/.test(env)) failures.push("Environment template is missing the server-only Supabase key placeholder.");
if (failures.length) {
  console.error("RLS validation failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`RLS validation passed across ${files.length} migrations and ${privateTables.length} protected domains.`);
