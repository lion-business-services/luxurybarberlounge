# Booking Live Activation

The public booking page depends on the production booking migrations and the verified launch catalog.

1. Link the local repository to the correct Supabase project.
2. Run `npx supabase@latest db push`.
3. Confirm local and remote migrations match through `202608060015_booking_launch_activation.sql`.
4. Redeploy Vercel without the previous build cache.
5. Open `/api/booking/catalog`. It must return `ok: true`, at least one verified barber, at least one service, and the Northfield location.
6. Open `/book`, choose a service, choose Rubén or first available, choose a time, and submit a controlled test appointment.
7. Confirm the appointment appears in `/admin/appointments`.
8. Confirm the client and shop emails appear in Resend Logs.

Migration 015 seeds only verified production information: Rubén Díaz Jr., five core services, service eligibility, business hours, a live weekly schedule, and the Northfield location. Temporary barber identities remain excluded from public booking.
