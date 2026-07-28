# Motion Architecture

## Responsibilities

- Motion for React handles reveal, pointer, layout, and standard scroll-linked behavior.
- GSAP is limited to cinematic sequences where a timeline materially improves control.
- Lenis is a progressive enhancement and must turn off for reduced motion, constrained input, route transition issues, and problematic mobile browsers.
- CSS handles shimmer, line movement, hover transitions, and static fallback styling.

## Guardrails

- The first hero frame is complete and conversion-ready before scrolling.
- Native scrolling is never locked or hijacked.
- Booking, navigation, and call actions remain interactive immediately.
- Cursor effects run only on fine-pointer devices and disappear for reduced motion.
- Offscreen animation is paused where practical.
- Transform and opacity are preferred over continuous layout changes.
- Mobile uses fewer layers and shorter distances, not a miniature desktop timeline.
- No autoplay audio, flashing, or motion-dependent information.

## Hero assets

Hero imagery lives in `public/hero`; the official logo assets live in `public/brand`. Real HTML owns headings and buttons so content remains responsive, accessible, and editable.
