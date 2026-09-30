# Elvis removal (2026-09-30)

## Order matters

1. **Deploy the code first.** Upload this repository to GitHub. Vercel deploys it automatically.
   Wait until the Vercel deployment shows **Ready**.
   The previous code re-activated every barber listed in `src/lib/content/site.ts` each time the booking page loaded, so the database step must run after this version is live.
2. **IN: Supabase Dashboard > SQL Editor.** Paste and run `supabase/manual/elvis-removal-01-preview.sql`.
   This is read only. If it lists upcoming appointments or active walk-ins for Elvis, reassign or cancel them in the admin portal first.
3. **IN: Supabase Dashboard > SQL Editor.** Paste and run `supabase/migrations/202609301200_archive_barber_elvis.sql`.
   It backs up every row it changes into the private `lbl_backup` schema, then archives Elvis.
   It stops without changing anything if Elvis still has upcoming bookings. It is safe to run twice.

## What changed in code

- Removed Elvis from the public roster (`src/lib/content/site.ts`) and the legacy slug map (`src/lib/booking/catalog.ts`).
- Admin barber list now hides archived barbers (`src/lib/portal/admin-data.ts`).
- Staff invitations refuse archived barbers, so a re-sent invite cannot restore Elvis's portal access (`src/app/api/admin/invitations/route.ts`).
- Deleted all Elvis portrait files from `public/media/barbers` and `media-src/barbers`, and their manifest entries.
- Removed Elvis from the development seed, content validator, tests, README, and roster docs.
- Historical migrations were not edited, because they already ran in production.

## Why archive instead of delete

Past appointments reference his profile, so the database blocks a hard delete, and deleting them would erase payment and commission history.
Archived barbers do not appear on the website, in booking, in the walk-in queue, in Square sync, or in the admin barber list.

## Square

If Elvis is set up as a team member in Square, deactivate him there too (IN: Square Dashboard > Staff > Team). The website does not use Square Bookings for public booking, but this keeps Square and the website consistent.
