# Rubén Diaz, Jr. Profile

## Public identity

- Public name: Rubén Diaz, Jr.
- Compact label: Ruben
- Slug: `/barbers/ruben-diaz-jr`
- Title: Owner and Master Barber
- Source portrait: `public/media/barbers/originals/ruben-diaz-jr.jpeg`
- Public card: `public/media/barbers/cards/ruben-diaz-jr.webp`
- Public profile: `public/media/barbers/profiles/ruben-diaz-jr.avif`

The approved founder story is used to describe his role without adding unsupported awards, licenses, exact years of experience, review totals, celebrity clients, or certifications.

## Booking state

Ruben is active in the centralized roster and eligible for the standard service menu. He appears in public directories, profile routing, structured content, and the booking barber selector. Appointment selection remains disabled until a real owner-managed schedule exists. Languages, walk-in eligibility, public social link, and any special service restrictions remain pending owner confirmation.

## Owner and barber role separation

The owner account and public barber profile are separate security concepts.

- Owner access is assigned only when the authenticated, email-confirmed user matches server-side `INITIAL_OWNER_EMAIL`.
- The verified owner receives both `owner` and `barber` role records.
- The same verified user ID is linked to Ruben's `staff_profiles` and `barber_profiles` records.
- Public profile data, display name, browser-provided email, or booking selection can never grant owner access.
- Portal authorization and RLS continue to use authenticated user IDs and server-managed roles.

Migration `202608060017_ruben_live_booking_release.sql` consolidates likely duplicate Ruben records while preserving references and archives a conflicting duplicate instead of corrupting overlapping appointment history.
