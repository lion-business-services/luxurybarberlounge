# Production Booking System

## Purpose

`/book` is the stable, business-owned booking route for Luxury Barber Lounge. It remains lighter than the homepage and does not load cinematic homepage assets, the custom cursor, or unrelated portal modules.

## Root-cause repair

The former default unavailable state was caused by the public catalog endpoint invoking an administrative bootstrap function on every page load. That path required `SUPABASE_SERVICE_ROLE_KEY`, performed writes, and failed whenever production credentials, migrations, or seeded schedules were incomplete. A display-only catalog read should never have needed a skeleton key to the building, but humanity does enjoy giving GET requests administrative responsibilities.

Normal page loads now call the security-definer `get_public_booking_catalog()` RPC through the public Supabase client. The function returns only published catalog data and does not expose staff user IDs, schedule rows, client data, or credentials. Administrative catalog bootstrap remains an explicit fallback when a service-role client is available. Availability and submission continue to require protected server-side access.

## Source of truth

Supabase is the active booking and availability source until Square production credentials, service variation mappings, team-member mappings, location mapping, and seller-level booking permissions are verified. The public interface is provider-neutral so Square can later replace the operational adapter without redesigning the booking flow.

## Booking sequence

1. Load published services, eligible active barbers, location, and add-ons through the public catalog RPC.
2. Show eligible barbers. Profiles without a current schedule remain visible but disabled with an availability explanation.
3. Search server-calculated availability.
4. Collect validated client, consent, and policy information.
5. Revalidate the slot on the server.
6. Match or create the client by verified identifiers.
7. Call `create_appointment_atomic`.
8. Persist snapshots, add-ons, consent, assignment, and audit data.
9. Attempt FormSubmit administrative delivery.
10. Queue client and barber transactional jobs.
11. Schedule reminders and prepare queue behavior.
12. Return the stored reference and secure manage token.

A provider email failure never rolls back a successfully created appointment. A confirmation is never displayed until the atomic booking function succeeds.

## Important production rules

Only active, non-demo barber profiles with service eligibility can appear. A barber is selectable only when a current schedule exists. Catalog synchronization inserts defaults only for a profile that has no active schedule and never deactivates or overwrites owner-managed schedules during a read.

Rubén Diaz, Jr. appears as an eligible public profile but remains unselectable until his real schedule is published. His owner authorization is linked only through a verified server-side owner account, not through the public profile, display name, or browser-supplied email.
