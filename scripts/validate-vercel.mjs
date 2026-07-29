import { readFile } from "node:fs/promises";

const raw = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
const config = JSON.parse(raw);

if (config.framework !== "nextjs") {
  throw new Error("vercel.json must declare the Next.js framework.");
}
if (config.installCommand !== "npm ci --include=optional") {
  throw new Error("Vercel must install optional native dependencies for the active Linux platform.");
}
if (config.buildCommand !== "npm run build") {
  throw new Error("Vercel build command must run the production Next.js build.");
}
if (Array.isArray(config.crons) && config.crons.length > 0) {
  throw new Error("Deployment crons must remain disabled until provider credentials and the required Vercel plan are activated.");
}
console.log("Vercel configuration validation passed: production build enabled, optional native packages included, integration crons disabled.");
