# Deployment

## Source release

The ZIP excludes `.git`, `.next`, `node_modules`, local environment files, logs, caches, and secrets. Preserve the existing repository’s `.git` directory when replacing files.

## Vercel

1. Configure variables from `.env.example` by environment.
2. Keep live provider flags disabled initially.
3. Run `npm ci` and `npm run check` in a clean Linux environment.
4. Deploy Preview.
5. Test public pages, mobile hero, video, authentication, role protection, and safe credential-pending states.
6. Apply Supabase migrations and configure Resend SMTP.
7. Activate providers one at a time using their setup documents.
8. Promote only after production smoke tests.

Vercel cron calls the notification endpoint. Set `CRON_SECRET` and verify authorized responses.

## Rollback

Use the previous Vercel deployment and database-safe forward migrations. Never roll back by deleting immutable calculation/Statement history.
