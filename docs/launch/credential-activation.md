# Credential Activation

Activate providers one at a time.

## Supabase

- Apply migrations and RLS to preview.
- Run role tests.
- Configure auth redirects and server sessions.
- Add production URL/anon key and server-only service role.
- Confirm no service key reaches client bundles.

## Square

- Complete sandbox mapping and webhook tests.
- Confirm public catalog and policies match.
- Add production credentials server-side.
- Enable `live_square`, `square_bookings`, and `square_live_booking` only after QA.

## Email and SMS

- Verify sender identity and consent flows.
- Test bilingual templates in provider test mode.
- Enable flags after suppression and retry tests.

## AI and analytics

- Approve grounding and tools.
- Configure consent-aware analytics.
- Never let provider absence break rendering.
