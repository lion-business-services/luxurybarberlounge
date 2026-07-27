# Motion & Interaction System

Added to the existing design system. **No colors, fonts, spacing, or layout tokens were changed** — everything below layers on top of `globals.css` under the `MOTION LAYER` comment.

## Architecture

The rule this system follows: **JavaScript writes one CSS variable per frame; CSS does every transform.** No React re-renders while scrolling, no layout thrash, GPU-friendly properties only (`transform`, `opacity`, `filter`).

| Piece | File | What it does |
|---|---|---|
| `MagneticCursor` | `components/motion/MagneticCursor.tsx` | Brass ring eases toward the pointer; a dot tracks exactly. Over `[data-magnetic]` elements the ring snaps to the element's shape and the element drifts toward the cursor. |
| `Scene3D` / `Layer` | `components/motion/index.tsx` | `Scene3D` sets a perspective volume and publishes scroll position as `--sp` (0→1) and `--sc` (−1→1). `Layer` reads those to translate on Z and rotate — the "scroll to discover" effect. Content sits **flat exactly when centred** in the viewport, so nothing is ever read at an angle. |
| `TiltCard` | same | Pointer-reactive 3D tilt plus a brass sheen that follows the cursor across the card. |
| `Reveal` | same | One-shot enter animation (`up`, `left`, `right`, `fade`, `blur`) with `delay` for stagger. |
| `ScrollProgress` | same | Hairline brass rule at the top of the viewport. |
| `CountUp` | same | Numerals count up when scrolled into view (easeOutExpo). |

## Making anything magnetic

```tsx
<Link href="/visit" data-magnetic>Reserve a chair</Link>
```

That is the whole API. The cursor discovers targets via `closest('[data-magnetic]')`, so it works on elements added later.

## Guardrails (why this won't feel laggy or break accessibility)

- **Touch devices never load the cursor.** Gated on `(pointer: fine) and (hover: hover)`.
- **`prefers-reduced-motion` disables everything** — reveals resolve to visible, layers flatten, the cursor unmounts, and a global CSS guard neutralizes stray animations.
- **Offscreen scenes cost nothing.** Every scroll listener is gated by `IntersectionObserver` and rAF-throttled; the cursor loop parks itself once motion settles.
- **The native cursor is only hidden while ours is mounted**, and never over inputs/textareas — text entry always keeps a real caret.
- **Skip-to-content link** added to the layout for keyboard users.
- Focus states, tab order, and semantics are untouched.

## Verified in this environment

- `npx tsc --noEmit` — passes
- `npx eslint .` — passes, zero warnings
- `npm run build` (Next 16 / Turbopack) — compiles, all 7 routes prerendered static

> The production build was validated with the Google Fonts import temporarily stubbed, because `fonts.googleapis.com` is blocked in the build sandbox. The real font loader is restored and unchanged. On any machine with network access, `npm run build` runs clean as-is.

## Still to wire (needs credentials / owner input)

- Real booking: currently every CTA routes to `/visit`. Point these at Square Appointments once the location ID and booking URL arrive from the intake form.
- Pricing, hours, roster, and phone in `lib/content/site.ts` are marked `CONFIRM` — replace from the owner intake form.
- `lib/supabase.ts` is now lazy and non-throwing (`getSupabase()` returns `null` when unconfigured), so pages that use it will not break the build before env vars exist.
