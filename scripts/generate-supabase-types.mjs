import { spawnSync } from "node:child_process";
import fs from "node:fs";

const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  console.error("Set SUPABASE_PROJECT_REF before generating hosted database types.");
  process.exit(1);
}
const result = spawnSync("npx", ["supabase@latest", "gen", "types", "typescript", "--project-id", projectRef, "--schema", "public"], { encoding: "utf8", shell: process.platform === "win32" });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Supabase type generation failed.\n");
  process.exit(result.status ?? 1);
}
fs.writeFileSync("src/lib/supabase/database.types.ts", result.stdout, "utf8");
console.log("Generated src/lib/supabase/database.types.ts from the linked hosted schema.");
