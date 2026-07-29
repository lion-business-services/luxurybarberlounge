import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

async function exists(file) {
  try {
    await access(file);
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

const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(pkg.dependencies?.gsap, undefined, "Unused GSAP dependency should not ship.");
assert.ok(pkg.dependencies?.motion, "Motion dependency is required.");

assert.equal(await exists("next.config.mjs"), false, "Duplicate Next configuration remains.");
assert.equal(await exists("next.config.ts"), true, "Typed Next configuration is missing.");
assert.equal(await exists(".env.local"), false, "A local environment file must never ship.");

for (const file of [
  "src/lib/motion/devicePerformance.ts",
  "src/lib/motion/useAdaptiveMotionTier.tsx",
  "src/components/GlobalClientWidgets.tsx",
  "src/components/motion/ScrollProgress.tsx",
  "docs/performance-final-audit.md",
]) {
  assert.equal(await exists(file), true, `Missing performance architecture file: ${file}`);
}

const sourceFiles = await walk("src", (file) => /\.(?:ts|tsx|js|mjs)$/.test(file));
let lenisImports = 0;
let gsapReferences = 0;
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  if (/from ["']@studio-freight\/lenis["']|import\(["']@studio-freight\/lenis["']\)/.test(source)) lenisImports += 1;
  if (/\bgsap\b|ScrollTrigger/.test(source)) gsapReferences += 1;
}
assert.equal(lenisImports, 1, `Expected one coordinated Lenis import, found ${lenisImports}.`);
assert.equal(gsapReferences, 0, `Unexpected GSAP references remain: ${gsapReferences}.`);

const smooth = await readFile("src/components/SmoothScroll.tsx", "utf8");
assert.match(smooth, /shouldUseSmoothScroll/);
assert.match(smooth, /syncTouch:\s*false/);
assert.match(smooth, /document\.hidden/);

const cursor = await readFile("src/components/motion/MagneticCursor.tsx", "utf8");
assert.match(cursor, /shouldUseCustomCursor/);
assert.match(cursor, /requestAnimationFrame/);
assert.doesNotMatch(cursor, /setState\s*\(/);

const atmosphere = await readFile("src/components/motion/HomeAtmosphere.tsx", "utf8");
assert.match(atmosphere, /devicePixelRatio/);
assert.match(atmosphere, /document\.hidden/);
assert.match(atmosphere, /tier !== "full"/);

const postHero = await readFile("src/components/home-experience/PostHeroExperience.tsx", "utf8");
assert.match(postHero, /useAdaptiveScrollProgress/);
assert.match(postHero, /tier === "reduced" \|\| tier === "mobile"/);

const publicMedia = await walk("public/media", () => true);
let oversizedDeliveryAssetCount = 0;
for (const file of publicMedia) {
  const info = await stat(file);
  const normalized = file.split(path.sep).join("/");
  const isOriginal = normalized.includes("/originals/");
  if (!isOriginal && info.size > 4 * 1024 * 1024) oversizedDeliveryAssetCount += 1;
}
assert.equal(oversizedDeliveryAssetCount, 0, "A non-original delivery asset exceeds 4 MB.");

console.log(`Performance validation passed: ${sourceFiles.length} source files, one Lenis owner, no GSAP overlap.`);
