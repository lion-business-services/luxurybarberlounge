# Automation Operations

Automation records separate triggers, conditions, actions, localized templates, jobs, deliveries, retries, consent, quiet hours, suppression, and audit.

Launch catalog includes booking confirmation, appointment reminders, cancellation, queue updates, post-service feedback, rebooking, birthday, lapsed-client, dispute, settlement, webhook-failure, and owner-summary foundations.

Live sends require:

- approved provider
- approved sender
- matching feature flag
- correct transactional/marketing classification
- valid consent where required
- quiet-hour check
- idempotency key
- suppression and unsubscribe check
- delivery log and retry policy

Development adapters never send external messages.
