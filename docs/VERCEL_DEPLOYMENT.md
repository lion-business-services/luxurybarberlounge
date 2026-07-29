# Vercel deployment

## Safe initial deployment

This release intentionally deploys without scheduled cron jobs. The notification and Square webhook-processing routes remain in the repository, but they should not be scheduled until Supabase, provider credentials, `CRON_SECRET`, and the appropriate Vercel plan are active.

The previous configuration scheduled one job hourly and another every ten minutes. Vercel Hobby projects reject cron expressions that run more than once per day, which can block the entire deployment before the application build is promoted.

## Required project settings

- Framework preset: Next.js
- Root directory: repository root containing `package.json`
- Node.js: 22.x
- Install command: `npm ci --include=optional`
- Build command: `npm run build`
- Production branch: `main`

The `--include=optional` flag is deliberate. Next.js uses a platform-specific optional SWC compiler package during Linux builds.

## Initial environment variables

The public website builds without live provider credentials. Keep live integration flags disabled until each provider is configured. Set at minimum:

```text
NEXT_PUBLIC_SITE_URL=https://www.theluxurybarberlounge.com
NEXT_PUBLIC_PORTAL_DEMO_MODE=false
INITIAL_OWNER_EMAIL=info@theluxurybarberlounge.com
```

Do not add real secrets to Git. Add them only in Vercel Project Settings.

## Activating cron jobs later

After Supabase, `CRON_SECRET`, notifications, and webhook processing are operational, add schedules through the Vercel dashboard or a reviewed `vercel.json` update. On Hobby, schedules must not run more than once per day. More frequent processing requires the appropriate paid plan or an external scheduler.

Recommended activation order:

1. Configure and test Supabase.
2. Configure `CRON_SECRET`.
3. Verify notification and webhook routes manually.
4. Choose a supported schedule for the project plan.
5. Re-enable one job at a time and inspect production logs.
