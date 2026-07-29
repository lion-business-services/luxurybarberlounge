# Vercel release validation

Release: `vercel-ready-v7.1`
Date: 2026-07-29

## Deployment blockers removed

The prior source release contained two active Vercel cron schedules, one hourly and one every ten minutes. Those schedules can prevent deployment on a Vercel plan that does not support that frequency. The initial deployment configuration now contains no cron schedules. The API routes remain available and can be scheduled later after provider credentials, `CRON_SECRET`, and the required Vercel plan are active.

Additional deployment hardening completed:

- Node.js is pinned to 22.x in `package.json` and `.nvmrc`.
- npm is pinned through the `packageManager` field.
- Vercel installs optional platform dependencies with `npm ci --include=optional`.
- `.npmrc` explicitly preserves optional dependencies.
- The package lock includes the Linux Next.js SWC packages.
- Build-time Google font downloads were removed. The approved fonts load at runtime with resilient system fallbacks.
- GitHub Actions uses the same Node version and optional-dependency installation as Vercel.
- A repository validator rejects unsupported active cron schedules before release.
- The ZIP places `package.json` at its root, avoiding an accidental nested Vercel root directory.

## Passing source gates

The following command completed successfully:

```bash
npm run check:source
```

Results:

- Formatting: passed
- ESLint: passed with zero warnings
- TypeScript strict check: passed
- Content validation: passed
- Migration validation: passed
- Route validation: passed
- Repository validation: passed
- Vercel configuration validation: passed
- Performance validation: passed
- Secret scan: passed
- Unit tests: 36 passed, 0 failed
- Integration tests: 16 passed, 0 failed

## Local production-build boundary

The production build was attempted with:

```bash
npm run build
```

This isolated execution environment could not download the Linux Next.js compiler from its internal package mirror:

```text
@next/swc-wasm-nodejs@16.2.6
HTTP 404 from packages.applied-caas-gateway1.internal.api.openai.org
Failed to load SWC binary for linux/x64
```

The failure occurred before the application source was compiled. The lockfile contains the correct Linux optional packages, and the release forces optional-dependency installation. A clean GitHub Actions or Vercel build using the normal npm registry is the remaining production compilation gate.

## Vercel project settings

Use:

- Framework preset: Next.js
- Root directory: repository root
- Production branch: `main`
- Node.js: 22.x
- Install command: `npm ci --include=optional`
- Build command: `npm run build`
- Ignored Build Step: disabled

Do not enable scheduled jobs until integrations and the project plan are ready.
