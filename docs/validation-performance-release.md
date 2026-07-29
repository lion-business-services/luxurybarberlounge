# Performance Release Validation

## Passed

- Format guard
- ESLint with zero reported errors
- TypeScript strict checking
- Content validation: 31 services, 9 barbers, 3 memberships
- Migration validation: 6 ordered transactional migrations
- Route validation: 145 page routes and 43 literal internal destinations
- Repository validation: 239 source files
- Performance architecture validation
- Secret scan
- Unit tests: 25 passed, 0 failed
- Integration tests: 8 passed, 0 failed
- Protected hero file hashes

## External environment blockers

### Clean dependency installation

Command:

```bash
npm ci --ignore-scripts
```

The command was run in an isolated directory using only the release `package.json` and `package-lock.json`, so the working dependency tree was not altered. The configured package mirror returned:

```text
404 Not Found: zod-validation-error-4.0.2.tgz
```

### Production build

Command:

```bash
npm run build
```

Next.js could not load a Linux SWC binary from the supplied Windows-oriented dependency archive and attempted to download its platform fallback. The configured package mirror returned:

```text
404 Not Found: @next/swc-wasm-nodejs-16.2.6.tgz
Failed to load SWC binary for linux/x64
```

This prevented Next.js startup and therefore prevented local Chromium, Firefox, Safari, Lighthouse, runtime console, frame-rate, memory, throttling, and viewport automation against this exact optimized tree. No browser-performance numbers are claimed without a runnable production or development server.

The source tree passed every validation that does not require the externally unavailable package artifacts. Vercel or a normal development machine with npm registry access can install the lockfile's platform dependencies and run the final build.
