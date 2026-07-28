# Attribution Operations

Initial policy:

- Shop-generated client: 70% barber / 30% shop
- Verified pre-existing barber client: 100% barber
- Verified barber personal referral: 100% barber

Decision order:

1. Locked historical attribution
2. Authorized owner override
3. Validated barber referral code
4. Verified prior relationship
5. Tracked shop campaign
6. Website or walk-in source
7. Shop default

Barbers may dispute but cannot edit attribution. Overrides require a reason and actor. Rule changes create new effective-dated versions; historical settled records do not silently recalculate.

The deterministic implementation is in `src/lib/attribution/engine.ts` and is covered by unit tests.
