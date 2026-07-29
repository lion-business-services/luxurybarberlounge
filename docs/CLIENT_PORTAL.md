# Client Portal

The mobile-first client workspace includes dashboard, appointments, rebook, queue, barber discovery, membership, rewards, referrals, grooming profile, inspiration uploads, notifications, feedback, support, account, privacy, and consent history.

The dashboard prioritizes the next appointment, barber, service, date/time, deposit state, calendar action, reschedule/cancel/rebook, queue status, favorite barber, membership, and relevant notices. Essential actions remain available without motion.

Private client data is scoped to `auth.uid()` by RLS. Inspiration uploads are private and use signed URLs. Square remains the booking/payment source of truth after activation.

## Privacy requests

`/client/privacy` records authenticated data-export and account-deletion review requests as support cases. Deletion is never immediate from the browser, and records subject to transaction, tax, consent, dispute, or audit retention are not silently erased.
