import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["src", "scripts", "tests", "docs", "supabase"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".css", ".md", ".sql"]);
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (extensions.has(path.extname(entry.name))) {
      const content = await readFile(full, "utf8");
      if (content.includes("\r\n")) failures.push(`${full}: CRLF line endings`);
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (/[ \t]+$/.test(line)) failures.push(`${full}:${index + 1}: trailing whitespace`);
      });
      if (content.length && !content.endsWith("\n")) failures.push(`${full}: missing final newline`);
    }
  }
}

for (const root of roots) await walk(root);
if (failures.length) {
  console.error(failures.slice(0, 100).join("\n"));
  process.exit(1);
}
console.log("Format guard passed.");
