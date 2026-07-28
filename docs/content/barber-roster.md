# Barber Roster and Portrait Replacement

## Verified identity

- `ruben-diaz-jr` uses the owner-supplied Rubén photograph and verified name.

## Temporary identity content

The remaining eight names, titles, biographies, specialties, language labels, service mappings, and availability labels are polished temporary launch data. They are not claims of licenses, awards, exact experience, or credentials.

Temporary records:

- Amaya Reyes
- Adrian Cole
- Mateo Cruz
- Julian Vega
- Elias Moreno
- Nico Santos
- Marcus Bennett
- Andre Silva

Update each record in `src/lib/content/site.ts`. Keep the existing slug only when preserving public URLs is important. Add the Square team-member ID later without changing image paths or layout.

## Images

Each record contains:

- card image
- profile WebP image
- profile AVIF image
- mobile image
- localized alt text
- card/profile/mobile focal positions

Never replace an optimized derivative without retaining the original under `public/media/barbers/originals`.
