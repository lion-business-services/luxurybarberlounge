# Existing-design continuation

This build intentionally preserves the original editorial black, brass, bone, and oxblood design language. It enhances rather than replaces the visual identity.

## Added
- Transparent official crest assets
- Cinematic hero depth and responsive logo presentation
- Desktop magnetic cursor with reduced-motion and touch-device safeguards
- Scroll-to-discover 3D craftsmanship sequence
- Viewport reveal animation system
- Animated service and barber cards
- Persistent mobile booking actions
- Booking and walk-in route foundations
- Square configuration adapter and integration health endpoint
- Initial configurable automation rules

## Activation still required
1. Enter Square sandbox credentials in `.env.local`.
2. Replace sample services, barber names, availability, phone, address, and hours.
3. Connect Supabase and apply the eventual production schema/RLS migrations.
4. Connect Resend/Postmark and Twilio for live email/SMS delivery.
5. Verify all policies and pricing with the owner before launch.

Heavy motion automatically reduces on smaller devices and is disabled when the visitor requests reduced motion.
