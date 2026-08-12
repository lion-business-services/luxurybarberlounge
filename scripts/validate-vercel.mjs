import { readFile } from "node:fs/promises";

const raw = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
const config = JSON.parse(raw);

if (config.framework !== "nextjs") throw new Error("vercel.json must declare the Next.js framework.");
if (config.installCommand !== "npm ci --include=optional") throw new Error("Vercel must install optional native dependencies for the active Linux platform.");
if (config.buildCommand !== "npm run build") throw new Error("Vercel build command must run the production Next.js build.");

const expected = new Map([
  ["/api/cron/square-sync", "*/10 * * * *"],
  ["/api/cron/webhooks", "*/2 * * * *"],
  ["/api/cron/notifications", "*/5 * * * *"],
  ["/api/cron/appointments", "*/15 * * * *"],
  ["/api/cron/queue", "*/5 * * * *"],
  ["/api/cron/commissions", "*/15 * * * *"],
  ["/api/cron/formsubmit", "*/10 * * * *"],
]);
for (const cron of config.crons ?? []) {
  if (!expected.has(cron.path) || expected.get(cron.path) !== cron.schedule) throw new Error(`Unexpected cron configuration for ${cron.path}.`);
  expected.delete(cron.path);
}
if (expected.size) throw new Error(`Missing operational cron jobs: ${[...expected.keys()].join(", ")}`);
console.log("Vercel configuration validation passed: production build and protected operational crons are configured.");
