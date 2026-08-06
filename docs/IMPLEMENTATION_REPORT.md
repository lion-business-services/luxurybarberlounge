# Implementation Report

Current release: `final-client-content-booking-v11.3`.

The repository now uses the client-confirmed eight-person barber roster, exact hours, nine-service catalog, 50% deposit, age rules, memberships, packages, and vouchers. Portraits retain their original person mapping and use one normalized responsive framing system. The Supabase-first booking architecture includes server availability, atomic appointment creation, conflict protection, admin/client/barber visibility, queue preparation, notification jobs, RLS, and provider adapters.

Square, FormSubmit, Resend, live Supabase, cron, browser QA, lint, semantic type checking, and production build require the external environment described in `docs/FINAL_RELEASE_REPORT.md`.
