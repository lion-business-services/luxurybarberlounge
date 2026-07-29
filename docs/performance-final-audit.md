# Luxury Barber Lounge Final Performance Audit

## Scope

This audit covers the complete Next.js repository supplied as the final visual baseline. The approved layout, business content, routes, hero media, barber photography, cinematic post-hero narrative, portals, and provider architecture were preserved. The work focused on runtime cost, cross-device behavior, media delivery, scroll ownership, cleanup, and responsive fallbacks.

## Root causes found

1. **Lenis ran globally on every route and device.** It was statically imported and maintained a permanent `requestAnimationFrame` loop, including on touch devices and operational portals.
2. **Global decorative widgets loaded eagerly.** The cursor, concierge, cookie interface, mobile actions, and scroll progress were mounted from the root layout regardless of route or capability.
3. **The home atmosphere over-rendered on ordinary hardware.** Five full-screen image layers and a canvas particle system were active on devices that did not benefit from the extra workload.
4. **Independent scroll listeners accumulated below the hero.** Several scenes each created their own continuous scroll-linked Motion calculations even when mobile and reduced-motion layouts used little or none of the resulting movement.
5. **Pointer effects were too broadly enabled.** Tilt and magnetic effects ran on standard laptops, and cursor target geometry was recalculated repeatedly.
6. **Motion capability checks were duplicated.** Components created overlapping media-query, resize, pointer, and connection listeners instead of sharing one conservative capability decision.
7. **Heavy visual effects remained active on mobile.** Large blur, backdrop filters, shadows, depth layers, and long sticky distances increased paint and compositing cost.
8. **Homepage motion code was coupled to initial rendering.** The complete post-hero client experience was imported with the main page instead of being split behind a meaningful server-rendered fallback.
9. **Configuration and dependency drift increased risk.** Two Next configuration files existed, an unused GSAP dependency was installed, dead motion components remained, and a custom Motion type shim shadowed the package's real types.
10. **Repository hygiene issues affected deployment safety.** The supplied archive included `.env.local`, build caches, copied `node_modules`, and widespread CRLF formatting.

## Implemented architecture

### Shared adaptive motion provider

`AdaptiveMotionProvider` classifies the browser into five non-invasive tiers:

- `high`
- `standard`
- `tablet`
- `mobile`
- `minimal`

The decision uses reduced-motion preference, data-saver state, effective connection type, pointer type, touch capability, viewport width, device memory when available, and hardware concurrency when available. Missing signals use conservative defaults. No signals are stored or sent anywhere.

### Smooth scrolling

Lenis is now a progressive enhancement only for high-capability desktop visitors on public routes. It is dynamically imported and is never loaded for:

- standard laptops
- tablets
- phones
- touch-only devices
- reduced-motion users
- data-saver users
- client, barber, reception, admin, and kiosk routes

Touch synchronization is disabled, the single RAF pauses while the document is hidden, and all work is cancelled on route change or unmount.

### Cursor and pointer interaction

The custom cursor now:

- runs only in `high` public mode
- uses one RAF-owned transform loop
- avoids React state for pointer movement
- caches magnetic target geometry
- stops when the tab is hidden or the pointer leaves the window
- never mounts on touch, reduced-motion, standard, tablet, mobile, minimal, or portal modes

Tilt cards use pointer response only in `high` mode. Buttons remain stable and keyboard accessible.

### Homepage atmosphere

High-capability desktop retains the complete cinematic crossfade system. All other modes use one optimized static plate with lightweight palette overlays. The decorative canvas is now desktop-only, capped at a 1.35 device-pixel ratio, limited to 12–24 particles instead of up to 46, capped near 30 FPS, paused in hidden tabs, and cleaned up on unmount.

### Post-hero scroll narrative

The post-hero experience remains visually intact but now uses IntersectionObserver-gated, RAF-throttled progress values. Mobile and minimal modes do not attach continuous scene-scroll listeners. The long scene transforms are replaced with the existing composed static/mobile layouts, while lightweight reveals and all content remain available.

The post-hero bundle is dynamically imported after the approved hero. Its loading state is a branded, readable “Step Into Distinction” threshold rather than a blank spacer.

### Public pages and portals

- Generic `Scene3D` scroll tracking is active only on high and standard desktops.
- Operational portals receive no cinematic cursor or Lenis runtime.
- Portal and reusable card surfaces use `content-visibility` where safe.
- Header, authentication, cookie, visit, and mobile action blur is removed or limited on smaller screens.
- Responsive tables preserve horizontal access without expanding the page viewport.

### CSS and compositor changes

- Continuous motion favors transform and opacity.
- Mobile removes expensive image filters, large shadows, backdrop blur, and decorative orbit shadows.
- `will-change` is removed from coarse-pointer and modest-device surfaces.
- Reduced-motion mode removes artificial scene heights, sticky pinning, decorative animation, blur, and waiting states.
- Major ordinary sections use contained paint and intrinsic placeholders to reduce below-the-fold rendering work.

### Media behavior

- Videos remain muted and `playsInline`.
- The post-hero lounge video uses `preload="metadata"` only on high-capability devices and `preload="none"` elsewhere.
- Videos pause offscreen and while the document is hidden.
- Mobile and reduced modes use existing posters rather than decoding decorative video.
- Existing WebP, AVIF, mobile portrait, poster, MP4, and WebM variants are retained.
- Full-resolution logo and video masters were moved from `public/` to `media-src/`, reducing publicly addressable assets from approximately 30 MB to 17 MB without removing source material from the repository.
- Dead duplicate image aliases and an unused legacy video registry were removed.
- Non-original delivery assets are validated to remain below 4 MB.

### Next.js and source cleanup

- Consolidated to one typed `next.config.ts`.
- Enabled AVIF/WebP image formats, responsive device sizes, compression, package import optimization, and immutable media caching.
- Removed unused GSAP dependency and dead motion components.
- Removed the custom Motion declaration shim.
- Removed committed `.env.local` and build cache files.
- Root widgets are route-aware dynamic imports and defer noncritical interfaces until idle time.

## Before and after runtime characteristics

| Area | Before | After |
| --- | --- | --- |
| Lenis | Eager, every route/device, permanent RAF | Dynamic, high desktop public routes only |
| Cursor | Broad fine-pointer enablement | High desktop public routes only |
| Home background | Five plates plus canvas broadly | Full system on high tier; one static plate elsewhere |
| Particle count | Up to 46 at full browser DPR | 12–24, DPR capped at 1.35, near 30 FPS |
| Post-hero scene progress | Multiple continuous Motion scroll hooks | Visibility-gated RAF progress; disabled on mobile/minimal |
| Portal decorative runtime | Global public widgets still mounted | Cinematic widgets excluded from operational routes |
| GSAP | Installed but unused | Removed |
| Next config | Duplicate TS and MJS configs | One typed configuration |
| Loading below hero | Client bundle dependency | Split bundle with branded semantic fallback |
| Reduced motion | Partial | Complete static composition without empty pin space |

## Validation and measurement limitations

Static validation, TypeScript, lint, content, routes, migrations, repository rules, secret scanning, unit tests, integration tests, and performance-specific checks are executed by `npm run check:source`.

A local production build and browser profiling could not be completed in the isolated build environment because Next.js attempted to download `@next/swc-wasm-nodejs@16.2.6` from the configured package mirror and the mirror returned HTTP 404 after the Linux native SWC variants were unavailable. A clean `npm ci --ignore-scripts` validation in an isolated directory was also blocked when the same mirror returned HTTP 404 for `zod-validation-error@4.0.2`. Direct access to the public npm registry was unavailable in this environment. This is an external compiler-distribution failure, not a TypeScript, lint, route, content, or test failure.

Because the optimized build could not start locally, this report does not invent Lighthouse, INP, LCP, FPS, Safari, or mobile-device measurements. The included Vercel deployment workflow installs the platform-correct SWC package from the lockfile and is the appropriate environment for final production Web Vitals capture.

## Deployment

1. Extract the final ZIP into the existing Git repository, preserving `.git` if applying it over the current checkout.
2. Copy `.env.example` to `.env.local` and provide only the intended environment values.
3. Run `npm ci` in an environment with normal npm registry access.
4. Run `npm run check`.
5. Commit and push. The existing Vercel project can deploy from the lockfile.

The release ZIP excludes `node_modules`, `.next`, caches, local logs, real environment files, and secrets.
