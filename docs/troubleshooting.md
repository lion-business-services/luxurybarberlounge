# Troubleshooting

## Next.js compiler cannot load

Delete copied dependencies and perform a clean install on the current operating system:

```bash
rm -rf node_modules .next
npm ci
```

Do not ship `node_modules` in the deployment ZIP.

## Portal redirects to login

This is expected in production while server auth is not activated. For an intentional preview of seeded dashboards, set `NEXT_PUBLIC_PORTAL_DEMO_MODE=true` in a non-production environment.

## Booking shows preview data

Square booking is disabled or incomplete. Configure sandbox values, map services/team, test webhooks, and enable the matching feature flags.

## Supabase write returns permission denied

Confirm the user role, business scope, session, migration version, and RLS policy. Do not bypass RLS from the browser.

## Hero motion is reduced

Check `prefers-reduced-motion`, pointer type, save-data/device constraints, viewport size, and the experimental hero flag. The static fallback is intentional.
