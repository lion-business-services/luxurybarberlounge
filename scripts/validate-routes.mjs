import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const appDir = path.join(root, "src", "app");
const sourceRoots = [path.join(root, "src")];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageFileToRoute(file) {
  let relative = path.relative(appDir, path.dirname(file)).replaceAll(path.sep, "/");
  if (!relative || relative === ".") return "/";
  const segments = relative
    .split("/")
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function routePattern(route) {
  const escaped = route
    .split("/")
    .map((segment) => {
      if (!segment) return "";
      if (/^\[\.\.\..+\]$/.test(segment)) return ".+";
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return ".*";
      if (/^\[.+\]$/.test(segment)) return "[^/]+";
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${escaped || "/"}/?$`);
}

const pageFiles = walk(appDir).filter((file) => file.endsWith(`${path.sep}page.tsx`) || file.endsWith(`${path.sep}page.ts`));
const routes = [...new Set(pageFiles.map(pageFileToRoute))].sort();
const patterns = routes.map((route) => ({ route, pattern: routePattern(route) }));

const hrefs = new Map();
const literalPatterns = [
  /href\s*=\s*["'](\/[^"'#?]*)["']/g,
  /href\s*=\s*\{\s*["'](\/[^"'#?]*)["']\s*\}/g,
];

for (const sourceRoot of sourceRoots) {
  for (const file of walk(sourceRoot).filter((item) => /\.(?:ts|tsx|js|jsx)$/.test(item))) {
    const text = fs.readFileSync(file, "utf8");
    for (const regex of literalPatterns) {
      for (const match of text.matchAll(regex)) {
        const href = match[1].replace(/\/$/, "") || "/";
        if (href.startsWith("/api/") || href.includes("${") || href.includes("[")) continue;
        const locations = hrefs.get(href) ?? [];
        locations.push(path.relative(root, file));
        hrefs.set(href, locations);
      }
    }
  }
}

const missing = [...hrefs.entries()].filter(([href]) => !patterns.some(({ pattern }) => pattern.test(href)));
if (missing.length > 0) {
  console.error("Internal route validation failed:");
  for (const [href, files] of missing) console.error(`- ${href} referenced by ${[...new Set(files)].join(", ")}`);
  process.exit(1);
}

console.log(`Route validation passed: ${routes.length} page routes and ${hrefs.size} literal internal destinations.`);
