# Known consistency gaps

Found by the consistency audit of October 2026 and not yet changed, because each needs an owner decision or a larger change. They are listed here so nobody has to rediscover them.

## 1. Barber editor and the booking page use different service lists

The Admin barber editor reads and writes `staff_services`. The booking page and the database use `barber_profile_services`. The existing sync runs only from `barber_profile_services` to `staff_services`.

Effect: unticking a service for a barber in the editor changes walk-in routing, and the booking page keeps offering that service with that barber.

Files: `src/app/api/admin/barbers/[id]/route.ts`, `src/lib/portal/admin-data.ts`, `src/lib/booking/catalog.ts`.

## 2. Barber editor edits one schedule row per weekday

The editor shows and updates the newest active `barber_schedules` row for a weekday and clears its end date. The booking engine merges every active row that applies on the date.

Effect: once a barber has a date-specific window for a weekday, saving the editor can turn that one-day window into a permanent one, and the older default keeps applying as well.

Files: `src/app/api/admin/barbers/[id]/route.ts`, `src/components/admin/AdminBarberEditor.tsx`, `src/lib/booking/slots.ts`.

## 3. The barber status field means different things in different places

`barber_profiles.availability_status` ("available", "unavailable", "off duty") is read by the walk-in queue in three slightly different ways and is not read by the booking engine at all. Booking availability comes only from the saved schedule, approved unavailable time and breaks.

Effect: a barber marked "Unavailable" in the profile is skipped by the queue and is still bookable on the website.

Decision needed: either the field is a walk-in setting only (rename it in the screens), or it should also close online booking.

## 4. Walk-in queue and appointments do not see each other

Walk-in assignment treats every barber as free now and ignores appointments, time off and breaks. The booking engine ignores walk-ins in service.

A checked-in appointment creates a queue entry that the admin queue hides, and the queue job can still assign it.

Files: `src/lib/queue/operations.ts`, `src/app/api/operations/queue/route.ts`.

## 5. Confirmation page wording when a payment is recorded and confirmation fails

The confirmation page decides "confirmed" from the amount still due. If a payment is recorded and the confirmation step fails, the client can read "Your chair is reserved" while staff see "Payment received, select to confirm". Staff are alerted in that case, so the booking is not lost.

## 6. Smaller items

- `/admin/bookings`, `/admin/today` and `/admin/operations` read Square bookings, not Supabase appointments. They are not in the menu.
- The Admin time off screen formats times in the browser's time zone.
- The live buffer setting is read by the engine; a few user messages print the constant instead.
- A staff account that opens the client portal relies on row-level security alone to scope what it sees.
