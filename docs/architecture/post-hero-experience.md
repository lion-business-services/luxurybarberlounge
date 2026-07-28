# Post-Hero Cinematic Experience

The approved `CinematicHero` is intentionally untouched. The homepage begins its new experience immediately after the hero boundary through `PostHeroExperience`.

## Scene architecture

1. Threshold: responsive interior video portal with poster fallback.
2. Precision: layered tool imagery and five-step service process.
3. Signature services: semantic, bookable service cards with price and duration.
4. Lounge: a bounded sticky sequence crossfading four architectural scenes.
5. Barbers: mirror-framed profile presentations using centralized barber data.
6. Transformation: keyboard and touch-accessible conceptual comparison slider.
7. Membership: editable membership concepts over atmosphere media.
8. Brand signature: generated card texture paired with the official logo.
9. Client confidence: truthful service commitments, no fabricated reviews.
10. Visit: stable address, phone, hours, parking, directions, and booking actions.
11. Final conversion: calm logo resolution and primary conversion actions.

## Motion system

- Motion for React controls scroll-linked transforms and scene reveals.
- `homeMotionConfig.ts` centralizes springs, easing, and motion tiers.
- `useMotionTier` selects high, standard, mobile, or reduced behavior.
- The spiral guide uses an SVG path whose draw progress follows the complete post-hero container.
- No perspective, transform, or overflow is applied to `html`, `body`, the root layout, or the approved hero.

## Reduced motion

Reduced-motion mode uses stable compositions, poster imagery instead of autoplay video, static lounge media, and removes scroll-scrubbed rotation and parallax. All content and CTAs remain present.

## Media

Optimized media lives under `public/media/home`. Original uploaded stills are retained under `public/media/home/originals` for future recropping. The video has MP4, WebM, and WebP poster variants.

## Editable content

- Business data: `src/lib/content/site.ts`
- Homepage scene copy/media: `src/components/home-experience/homeExperienceData.ts`
- Motion settings: `src/lib/motion/homeMotionConfig.ts`
- Scene styling: `src/components/home-experience/home-experience.module.css`
