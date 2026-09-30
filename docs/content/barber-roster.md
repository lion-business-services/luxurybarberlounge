# Barber Roster

The active centralized roster is:

- Rubén Diaz, Jr. (`ruben-diaz-jr`), Owner and Master Barber. Public and service-eligible; schedule, languages, walk-ins, and social link pending owner confirmation.
- Angelica Aquino (`angelica-aquino`)
- Hommy Rivera (`hommy-rivera`)
- Barber Lo's (`barber-los`)
- Jose (`jose`)
- Alfredo Hernandez (Pollo) (`alfredo-hernandez-pollo`)
- Russ Hawkins (`russ-hawkins`)
- Daniel Penalo (`daniel-penalo`)

The public roster is defined in `src/lib/content/site.ts`. Database consolidation and the privacy-safe booking catalog are provided by migration `202608060017_ruben_live_booking_release.sql`.

Elvis (`elvis`) was removed from the roster on 2026-09-30. His database record is archived, not deleted, by migration `20260930120000_archive_barber_elvis.sql` so past appointments, payments, and commission history stay intact.
