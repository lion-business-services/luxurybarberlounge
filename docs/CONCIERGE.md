# Sterling, the booking concierge

Sterling is the chat window on the public site. It answers questions about the lounge and books appointments inside the chat, then hands the client the same Square checkout the booking page uses.

## How it works

| Piece | File | Role |
| --- | --- | --- |
| Reader | `src/lib/concierge/understand.ts` | Pure, deterministic. Reads English and Spanish messages into intents, service, barber, date, time, part of day and family size. |
| Engine | `src/lib/concierge/engine.ts` | Pure. Decides the next question and builds every answer from the live catalog, the availability engine and `src/lib/content/site.ts`. |
| Route | `src/app/api/concierge/route.ts` | Stateless POST. Loads `getBookingCatalog()`, wraps `searchSupabaseAvailability()`, rate limits (40 per minute), never caches. |
| Interpreter (optional) | `src/lib/concierge/interpret.ts` | Server only. When `CONCIERGE_AI_API_KEY` is set, a model reads unusual phrasing into the same fields. Output is schema checked, filtered to real catalog slugs, and any failure or 3.5 second timeout falls back to the reader. |
| Window | `src/components/public/ConciergeWidget.tsx` | Shows the conversation, collects contact details, books through `/api/booking/submit`, pays through `/api/booking/payment-link`. |
| Name | `src/lib/concierge/identity.ts` | `CONCIERGE_NAME` and role labels. |

## Accuracy rules

- Prices, durations, services and barbers come only from the catalog. Times come only from the availability engine.
- A chosen time is checked again against live availability before contact details are taken, and `/api/booking/submit` validates it a third time. When a time was taken a moment ago, the route's real alternatives are offered.
- The model, when enabled, never answers, never sees the schedule and never decides price, availability or policy (CLAUDE.md rule 5).
- Contact details go straight to the booking route. They never pass through the conversation route or the model.
- Logs contain identifiers and steps only.

## Booking in the chat

1. The client names what they want in one sentence ("haircut with Ruben Tuesday at 3") or is guided step by step: service, family size when relevant, barber or first available, day, time.
2. The window shows a summary with the live price and the 4% service fee note, and asks for name, email, phone, consents and the policy acknowledgment.
3. "Reserve and pay with Square" submits the same payload as the booking page, with its own idempotency key.
4. "Pay with Square" opens the Square checkout link for that reference. The time is held 15 minutes, exactly as on the booking page.

## Settings

- `NEXT_PUBLIC_FEATURE_AI_CONCIERGE` (default on) shows or hides the window.
- `CONCIERGE_AI_API_KEY` (optional, Anthropic key) turns on the model interpreter. `CONCIERGE_AI_MODEL` overrides the model.

## Tests

- `tests/unit/concierge.test.ts` covers exact booking, closest real times, the guided flow, family pricing, informational answers, Spanish, mid-booking questions, re-checking a chosen time and state sanitizing.
- `tests/integration/concierge.test.ts` checks the window uses the shared booking and payment routes and that the engine holds no hard-coded prices.
