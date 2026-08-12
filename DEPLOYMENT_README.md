# Luxury Barber Lounge Deployment

This package is configured for the connected Supabase production project and Square Sandbox validation.

## Included

- Private `.env.production.local` with the supplied Supabase and Square Sandbox credentials.
- Generated `CRON_SECRET` and `BOOKING_MANAGE_SECRET` values.
- Automatic Square foundation synchronization every 10 minutes.
- Signed Square webhook endpoint at `/api/square/webhooks`.
- Square payment-link support for authorized Sandbox test bookings.
- Supabase barber portal invitations, commission linkage, queue, appointments, clients, memberships, and payment-link storage.

## Safe Sandbox behavior

The live website continues to use the Supabase scheduling engine while Sandbox credentials are installed. Public Square Bookings are intentionally disabled. Sandbox checkout is restricted to `support@lbsprocess.com`, so public customers cannot accidentally enter a fake Sandbox payment flow.

## Deployment

A host that builds directly from this archive can read `.env.production.local` during the Next.js build/runtime. If the source is moved into Git before deployment, `.env.production.local` will remain ignored by Git; copy the same environment variables into the hosting provider's encrypted Environment Variables settings instead.

Install and build with:

```bash
npm ci --include=optional
npm run build
npm run start
```

The `--include=optional` flag is required so Next.js installs the correct native SWC package for the deployment platform.

## After deployment

1. Open `/api/health` and confirm Square and Supabase report `configured`.
2. Let `/api/cron/square-sync` run, or invoke it through the configured protected cron, then verify Square integration health in `/admin/integrations`.
3. In Square Developer Dashboard, send a Sandbox test webhook to the configured subscription and verify it appears in `/admin/webhooks`.
4. Create a test booking using `support@lbsprocess.com`, test the Sandbox deposit link, and verify the webhook/payment state reaches Supabase.
5. Review `/admin/services` and `/admin/barbers` for any Square mappings that could not be resolved safely by exact email/name matching.

## Production Square cutover

The supplied Square credentials are Sandbox credentials. They cannot accept real customer payments. For real-money go-live, replace the Square application ID, access token, location ID, and webhook signature key with Production values, change `SQUARE_ENVIRONMENT=production`, create/verify the Production webhook subscription, run Square synchronization, and only then enable public Square Bookings feature flags.

Do not publish, email, or commit `.env.production.local`.
