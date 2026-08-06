# Production Booking System

## Purpose

`/book` is the stable, business-owned booking route for Luxury Barber Lounge. It is intentionally lighter than the homepage and does not load the cinematic hero, custom cursor, or unrelated portal modules.

## Source of truth

Supabase is the active booking and availability source until Square production credentials, service variation mappings, team-member mappings, location mapping, and seller-level booking permissions are verified. The public interface is provider-neutral so Square can later replace the operational adapter without redesigning the booking flow.

## Booking sequence

1. Load published services, eligible live barbers, location, and add-ons.
2. Search server-calculated availability.
3. Collect validated client and policy information.
4. Revalidate the slot on the server.
5. Match or create the client by verified email/phone identifiers.
6. Call `create_appointment_atomic`.
7. Persist appointment snapshots, add-ons, consent, and audit data.
8. Attempt FormSubmit administrative delivery.
9. Queue Resend/Twilio transactional jobs.
10. Return the saved reference and secure manage token.

A provider email failure never rolls back a successfully created appointment.

## Important production rule

Only active, non-demo barber profiles with service eligibility and schedules are bookable. Placeholder identities are archived by migration `202608060013`.
