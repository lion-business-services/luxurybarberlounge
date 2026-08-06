# Post-Hero Cinematic Experience

The approved `CinematicHero` remains isolated and unchanged. The post-hero experience begins immediately after the hero boundary through `PostHeroExperience`.

## Blank-section correction

The empty viewport after “Choose the result. We refine the ritual.” came from the previous Lounge scene reserving `300svh` of pinned scroll space while its first image layer began at `opacity: 0`. The services section also carried unusually large bottom spacing, which made the dead interval more obvious.

The correction removes the dead interval at its source:

- the Lounge sequence now uses a bounded `165svh` desktop pin
- the first Lounge frame is visible at scroll progress `0`
- the second frame crossfades without an uncovered interval
- the services scene uses content-driven height and tighter finishing space
- reduced-motion and mobile layouts remove the long pinned spacer entirely

No decorative filler was added to hide the problem.

## Current scene architecture

1. Threshold: responsive interior video portal with poster fallback.
2. Membership by Design: a direct continuation of the Threshold environment with selectable, editable membership concepts.
3. Precision: layered tool imagery and five-stage service process.
4. Signature services: semantic, bookable services with duration and starting price.
5. Lounge: a concise two-view architectural crossfade with stable visit actions.
6. Meet the Artists: nine real supplied portraits in an accessible, selectable editorial stage.
7. Transformation: keyboard and touch-accessible conceptual comparison slider.
8. Visit: stable address, phone, hours, parking, directions, and contact actions.
9. Make the Chair Yours: chair-centered final conversion scene with stable booking, barber, service, and call actions.

Removed from the homepage architecture:

- `Start with the result. We shape the ritual.`
- `The Room and the Craft`
- `Trust Is Earned in the Chair`
- the standalone brand-card interruption
- the old generic membership-card section

## Barber portrait mapping

The original files are preserved under `public/media/barbers/originals`.

Optimized derivatives are organized under:

- `public/media/barbers/cards`
- `public/media/barbers/profiles`
- `public/media/barbers/mobile`
- `public/media/barbers/booking`
- `public/media/barbers/tablet`
- `public/media/barbers/desktop`

Rubén Diaz, Jr. and the eight client-mapped barbers are centralized in `src/lib/content/site.ts`. Ruben uses the supplied owner portrait and is now a public barber profile, while his owner authorization remains server-controlled and separate. Routes, booking selectors, directory cards, profile pages, and the homepage update from the same roster.

## Motion system

- Motion for React controls scroll-linked transforms, springs, crossfades, selection transitions, and scene reveals.
- `homeMotionConfig.ts` centralizes springs and easing.
- `useMotionTier` selects high, standard, mobile, or reduced behavior.
- The spiral guide follows the shortened scene map and no longer references removed sections.
- No perspective, transform, or overflow is applied to `html`, `body`, the root layout, navigation, or the approved hero.

## Responsive behavior

- Desktop receives the full layered threshold, membership orbit, concise Lounge pin, editorial barber stage, and chair resolution.
- Tablet collapses two-column scenes, shortens perspective, and keeps direct controls visible.
- Mobile uses native vertical flow, a short Lounge pin, horizontal barber selectors, stable CTAs, fewer layers, and no pointer-dependent interaction.

## Reduced motion

Reduced-motion mode uses poster imagery, static membership and Lounge compositions, short fades, no scroll-scrubbed rotation, no decorative particles, and no long empty pin spacers. Every profile, price, service, and CTA remains available.

## Editable content

- Business, services, barbers, memberships: `src/lib/content/site.ts`
- Homepage scene copy and media: `src/components/home-experience/homeExperienceData.ts`
- Homepage implementation: `src/components/home-experience/PostHeroExperience.tsx`
- Scene styling: `src/components/home-experience/home-experience.module.css`
- Motion settings: `src/lib/motion/homeMotionConfig.ts`
