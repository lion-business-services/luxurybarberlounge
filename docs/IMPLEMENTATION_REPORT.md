# Implementation Report

## Responsive and cinematic experience

- Preserved the approved black, ivory, brass, bronze, and gold visual system.
- Rebuilt the mobile hero composition around safe-area insets and the persistent bottom action bar.
- Added mobile H.264 hero and lounge video variants with posters.
- Prevented the grand-opening label from breaking `5 PM` into an accidental second composition.
- Repositioned the Concierge control so it cannot collide with hero CTAs or the mobile action bar.
- Centralized motion tiers for desktop, laptop, touch, low-power, and reduced-motion conditions.
- Preserved the full story sequence while reducing simultaneous layers, blur, particles, and pointer work on constrained devices.
- Kept cinematic code out of operational portals.

## Homepage and public content

- Moved the real barber team directly after the hero.
- Integrated nine authentic portraits and responsive derivatives.
- Added a centralized internal image mapping. Rubén Diaz, Jr. is verified; the other names remain owner-confirmation items.
- Reduced the homepage to one six-service showcase.
- Added `/our-story` with Rubén's authentic portrait and fact-safe founder copy.
- Centralized business information, metadata, directions, contact data, and structured data.

## Authentication and roles

- Implemented Supabase email OTP request and verification endpoints.
- Implemented accessible six-digit code entry, paste, resend, expiration, and error states.
- Added HttpOnly session cookies, refresh, logout, role-aware routing, and server layout guards.
- Bootstraps the confirmed owner email only after successful OTP verification.
- Added owner-controlled staff invitations that are consumed only after the invited email verifies an OTP.
- Added an audited multi-role switcher.

## Operations and portals

- Added client, Independent Barber, reception, manager, and owner route boundaries.
- Added deterministic queue and Who's Next logic with reasons and rule versions.
- Added attribution claim, evidence, owner decision, and pairing architecture.
- Added integer-cent, basis-point commission calculations and immutable adjustment rules.
- Added statement, dispute, policy approval, open-decision, and acknowledgement workflows.
- Added authenticated client data-export and account-deletion request workflows.
- Added owner user-invitation and webhook recovery interfaces.

## Integrations and automation

- Preserved Square as financial and operational source of truth.
- Added verified, idempotent Square webhook intake.
- Added canonical Square booking, customer, order, payment, and refund synchronization handlers.
- Added webhook attempts, retry, dead-letter, administrative processing, and scheduled inbox processing.
- Added development and Resend email providers, development and Twilio SMS providers, consent-aware notification jobs, quiet hours, retry, and delivery history.
- Kept AI advisory and provider-neutral. It cannot confirm bookings, change attribution, calculate final settlement, or approve policy.

## Governance

- Implemented the locked v1.0 commission defaults from the owner policy.
- Kept proposed terms and open owner decisions inactive.
- Added versioned policy approvals, effective dates, acknowledgements, immutable locked calculations, and separate Adjustments.
- Included the authoritative policy document and mobile baseline screenshot under `docs/reference/`.
