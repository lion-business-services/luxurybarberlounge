# Deployment

## Source release

The release ZIP excludes `.git`, `.next`, `node_modules`, local environment files, logs, caches, and secrets. Copy the ZIP contents into the existing repository root while preserving its `.git` directory.

## Database

Apply migrations 008 and 009 if production currently stops at 007:

```bash
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest db push
npm run types:supabase
```

Do not run the development seed against production.

## Vercel

1. Configure variables from `.env.example` by environment.
2. Keep Square, queue, kiosk, membership billing, SMS, and AI flags disabled initially.
3. Use Node 22 and `npm ci --include=optional`.
4. Run `npm run check` in a clean Linux environment.
5. Deploy Preview and test client, manager, reception, barber, and owner identities separately.
6. Confirm Supabase, Resend OTP, session cookies, role redirects, RLS, logout, and owner-only routes.
7. Activate providers individually only after their setup and QA documents pass.
8. Promote the tested Preview to production.

## Scheduled jobs

The release does not commit frequent Vercel crons. After email/webhook QA, configure an approved scheduler to call `/api/cron/notifications` and `/api/cron/webhooks` with `Authorization: Bearer $CRON_SECRET`. Record job ownership, cadence, failure alerts, and rollback.

## Rollback

Use the previous Vercel deployment. Database corrections must be forward-only migrations. Never delete or rewrite locked calculations, statements, audit history, attribution decisions, consent records, or provider financial history.
