# Deployment

## Local validation

```bash
npm ci --include=optional
npm run check:source
npm run build
```

## Database

```bash
npx supabase@latest migration list
npx supabase@latest db push
npx supabase@latest migration list
npm run types:supabase
```

Remote migrations must match through `202608060017`. Verify that the public catalog RPC is executable by `anon` and that no service-role key is present in browser bundles.

## Vercel

- Framework: Next.js
- Node.js: 22.x
- Install: `npm ci --include=optional`
- Build: `npm run build`
- Root directory: repository root containing `package.json`
- Redeploy without prior cache after environment or lockfile changes.

Enable queue flags only after real staff, schedules, and production QA. Keep Square flags disabled until its credentials and mappings pass.
