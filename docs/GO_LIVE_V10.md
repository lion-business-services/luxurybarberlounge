> **Historical release record.** Superseded by `RELEASE-V11.3.md` and `docs/FINAL_RELEASE_REPORT.md`.

# Luxury Barber Lounge v10 Go-Live Guide

This release finishes the simplified client portal, owner operations dashboard, persistent Supabase sessions, privacy-safe in-shop queue display, barber service eligibility, and conservative commission reconciliation.

## 1. Deploy the source

Copy the release into the Git repository root. Preserve the existing `.git` directory and private `.env.local` file.

```powershell
npm ci --include=optional
npm run check:source
npm run build
git add .
git commit -m "Finalize operational portals, queue, and commissions"
git push origin main
```

Vercel must use Node.js `22.x`, install command `npm ci --include=optional`, and build command `npm run build`.

## 2. Apply the new Supabase migration

The release adds:

```text
202607310010_operational_queue_display.sql
```

Apply it to the already-linked Supabase project:

```powershell
npx supabase@latest migration list
npx supabase@latest db push
npx supabase@latest migration list
```

Local and remote migration versions must match through `202607310010`.

The migration adds privacy-safe queue labels, barber walk-in availability, deterministic queue policy v1, and the owner-approved commission and attribution policy v1.0.

## 3. Required Vercel variables

Keep the existing Supabase, Resend, owner, and cron values. For the operational queue, set:

```env
NEXT_PUBLIC_FEATURE_WALK_IN_QUEUE=true
NEXT_PUBLIC_FEATURE_KIOSK=true
```

Keep Square-dependent flags disabled until real Square credentials and mappings are complete:

```env
NEXT_PUBLIC_FEATURE_LIVE_SQUARE=false
NEXT_PUBLIC_FEATURE_SQUARE_BOOKINGS=false
NEXT_PUBLIC_FEATURE_SQUARE_LIVE_BOOKING=false
NEXT_PUBLIC_FEATURE_MEMBERSHIP_BILLING=false
```

After Square is connected and tested, change the relevant Square flags to `true` and redeploy.

Never expose these server-only values:

```text
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
SQUARE_ACCESS_TOKEN
SQUARE_WEBHOOK_SIGNATURE_KEY
RESEND_API_KEY
EMAIL_PROVIDER_API_KEY
```

## 4. Initial shop setup in the owner dashboard

Complete these in order:

1. **Services**: add or confirm the final service names, prices, durations, deposits, and booking availability.
2. **Barbers**: invite each barber using their real email address.
3. Each barber completes OTP sign-in once so the profile is linked to a real staff account.
4. Open each barber record and select the services that barber is qualified to perform.
5. Set each barber to active, accepting walk-ins, and the correct daily availability.
6. **Memberships**: create only approved plans. Publishing remains blocked until Square catalog mapping and membership billing are enabled.
7. **Queue**: test a walk-in, confirm automatic assignment, and verify the TV display.

The system does not seed unverified barber identities, prices, or membership terms into production.

## 5. In-shop queue display

Open this URL on the shop television or display computer:

```text
https://www.theluxurybarberlounge.com/queue-board
```

Use the full-screen button on the page. The board refreshes every five seconds.

Public display privacy rules:

- No phone number or email is returned by the public display API.
- No full private client record is exposed.
- A client name appears only when the guest explicitly consents.
- Without consent, the board shows a short guest token such as `Guest 7A2F`.
- The board shows only a privacy-safe guest label or token, assigned barber, queue status, and estimated wait. Service details remain private.

## 6. Queue operating flow

1. The client or receptionist opens `/walk-ins`.
2. The client selects a service and barber preference.
3. The entry is stored privately in Supabase.
4. The public board receives only the privacy-safe display projection.
5. Wait estimates are recalculated from active work and available barbers.
6. The deterministic assignment engine considers queue order, due appointment timing, service eligibility, preferred barber, availability, and projected workload.
7. Completing or removing an entry releases the barber assignment and automatically attempts the next eligible assignment.
8. Assignment and called/ready status changes queue a transactional client update when an approved email or consented SMS channel is available.
9. The protected queue cron repeats the reconciliation every five minutes as a recovery mechanism.

AI is not permitted to decide queue priority or final assignment.

## 7. Square connection required for appointments and commissions

The website code and webhook inbox are prepared, but live Square behavior requires the real business credentials and mappings:

```env
SQUARE_ENVIRONMENT=production
NEXT_PUBLIC_SQUARE_APPLICATION_ID=
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_WEBHOOK_NOTIFICATION_URL=https://www.theluxurybarberlounge.com/api/square/webhooks
NEXT_PUBLIC_SQUARE_BOOKING_URL=
```

Map:

- the Northfield location to the Square location ID,
- every active service to a Square catalog item or variation,
- every barber to the correct Square team member,
- provider-confirmed bookings and orders to the internal booking metadata.

Only then enable the Square feature flags.

## 8. Commission behavior

The locked owner policy is implemented conservatively:

- SHOP client: 70% barber / 30% shop.
- Approved pre-existing BARBER client: 100% barber.
- Tips: 100% barber and outside the commission basis.
- Walk-ins default to SHOP.
- Default is SHOP unless approved evidence supports BARBER attribution.
- Dispute window: 24 hours.
- Settlement week: Monday through Sunday.
- Payment remains manual by the approved Zelle or cash process.
- Calculations do not move funds and are not payroll.
- Locked history is corrected by adjustments, never silent edits.

The processor calculates only provider-confirmed, matched Square payments. Missing order, booking, or barber mappings create review exceptions instead of guessed amounts. Provisional weekly statements are generated automatically.

The following owner decisions remain intentionally unresolved and are not guessed: processing-fee treatment, product commissions, package redemptions, cancellation/no-show treatment, and any worker-classification decision.

## 9. Health checks after deployment

Open:

```text
https://www.theluxurybarberlounge.com/api/health
https://www.theluxurybarberlounge.com/api/integrations/status
```

Supabase should report configured. Email should report configured after Resend variables are deployed. Square should remain disabled until real credentials and webhooks pass testing.

Test these flows before launch:

- owner OTP login, navigation, refresh, public-site visit, and logout,
- client OTP login and access only to the client’s own records,
- barber invitation and service eligibility,
- walk-in join, privacy consent, automatic assignment, status changes, and TV display,
- service creation and activation,
- membership draft creation,
- Square sandbox booking, payment, refund, and webhook replay,
- commission calculation, exception handling, statement generation, and barber dispute.

## 10. Owner-facing daily operation

The owner dashboard intentionally exposes only:

- Dashboard
- Appointments
- Queue
- Clients
- Barbers
- Services
- Memberships
- Commissions

Webhook processing, booking confirmations, 24-hour appointment reminders, queue notifications, queue recovery, and commission reconciliation run in protected background jobs. The owner does not need a CRM or developer configuration console to operate the shop.
