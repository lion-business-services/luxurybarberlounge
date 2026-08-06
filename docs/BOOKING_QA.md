# Booking QA

## Automated coverage

Static and integration tests cover route presence, atomic creation, overlap constraints, idempotency, FormSubmit retry states, protected admin access, client ownership, queue privacy, reminders, and documentation.

## Manual production matrix

Test widths 320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1366, 1440, and 1920. Test Chrome, Edge, Firefox, iOS Safari, and Android Chrome where available.

Verify service selection, First Available, named barber, date changes, server conflict, double-click, browser back, refresh, autofill, QR parameters, slow network, upload limits, confirmation refresh, calendar download, client portal link, admin management, queue check-in, screen-reader labels, keyboard focus, reduced motion, and no horizontal overflow.

External live-delivery tests require the production Supabase, Resend, FormSubmit activation, and optional Square credentials.
