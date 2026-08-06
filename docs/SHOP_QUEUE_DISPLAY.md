# Shop Queue Display

The privacy-safe public display is served from the shop queue display route and API. It shows queue order, an abbreviated client label, assigned barber, current status, estimated wait where available, Up Next, Ready, and barber availability.

The display must never expose full email addresses, full phone numbers, payment information, private notes, internal administrative data, or authentication details. Client labels use a first name plus last initial, initials, or a booking-reference fragment.

Operational updates are designed to arrive through Supabase Realtime with refetch/recovery behavior after connection loss. The screen supports full-screen television and tablet use, distance-readable typography, minimal controls, and subtle motion that respects reduced-motion preferences.
