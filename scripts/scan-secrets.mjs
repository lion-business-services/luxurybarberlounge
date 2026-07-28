import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".next", "node_modules", "coverage", "out", "build"]);
const ignoredFiles = new Set(["package-lock.json"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".sql", ".yml", ".yaml", ".txt", ".example"]);

const detectors = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ["OpenAI-style key", /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}\b/g],
  ["Square access token", /\bsq0(?:atp|csp|idp)-[A-Za-z0-9_-]{20,}\b/g],
  ["Stripe secret", /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ["Twilio auth token assignment", /TWILIO_AUTH_TOKEN\s*=\s*[A-Fa-f0-9]{24,}/g],
  ["Supabase JWT-like secret", /SUPABASE_(?:SERVICE_ROLE_KEY|SECRET_KEY)\s*=\s*eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g],
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

const findings = [];
for (const file of walk(root)) {
  if (ignoredFiles.has(path.basename(file))) continue;
  const ext = path.extname(file);
  if (!textExtensions.has(ext) && !path.basename(file).startsWith(".env")) continue;
  const stat = fs.statSync(file);
  if (stat.size > 2_000_000) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const [label, regex] of detectors) {
    regex.lastIndex = 0;
    if (regex.test(text)) findings.push(`${label}: ${path.relative(root, file)}`);
  }
}

const committedEnvFiles = fs
  .readdirSync(root)
  .filter((name) => name.startsWith(".env") && !name.endsWith(".example"));
for (const file of committedEnvFiles) findings.push(`committed environment file: ${file}`);

if (findings.length > 0) {
  console.error("Secret scan failed:\n- " + findings.join("\n- "));
  process.exit(1);
}

console.log("Secret scan passed: no high-confidence committed credentials detected.");
