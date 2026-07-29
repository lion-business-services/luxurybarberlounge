# Troubleshooting

## Build cannot load SWC

Delete copied dependencies and install on the target OS:

```bash
rm -rf node_modules .next
npm ci
npm run build
```

## `MotionConfig` export error

Do not reintroduce the removed incompatible named import. The adaptive motion engine already handles reduced motion.

## Mobile video is blank

Verify the mobile MP4/poster exists, H.264 is supported, `muted` and `playsInline` are present, CSS opacity is not stuck at zero, the observer did not pause too early, and reduced-motion/data-saver logic did not intentionally select a still.

## OTP does not arrive

Check Supabase Auth logs, Resend SMTP/domain verification, sender address, template `{{ .Token }}`, rate limits, and spam. Never log or email the token through application debugging.

## Portal redirect loop

Check access/refresh cookies, `user_roles`, active role, server layout authorization, and RLS. Confirm `NEXT_PUBLIC_PORTAL_DEMO_MODE=false` in production.

## Empty queue/commission data

Apply all migrations, connect the correct business/location, enable feature flags only after setup, and verify Square/sandbox records. Credential-pending states are intentional.

## Webhook rejected

The signature key and exact notification URL must match Square. Confirm raw body handling and `x-square-hmacsha256-signature`.

## Supabase permission error

Test the user’s real role and business scope. Do not use the service-role key in the browser as a shortcut.
