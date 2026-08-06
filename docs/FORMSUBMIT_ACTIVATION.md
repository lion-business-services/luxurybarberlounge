# FormSubmit Activation

Activation is external and cannot be truthfully marked complete until the recipient clicks FormSubmit's confirmation link.

1. Deploy the production site with `FORMSUBMIT_ENABLED=true` and the recipient email.
2. Submit one controlled appointment from `https://theluxurybarberlounge.com/book` using a real available slot.
3. Confirm that the appointment appears in `/admin/appointments` before checking email.
4. Open `info@theluxurybarberlounge.com` and locate the FormSubmit activation message. Check Spam and Junk.
5. Click the activation/confirmation link.
6. Return to the admin appointment and use **Retry administrative email**, or wait for `/api/cron/formsubmit`.
7. Verify the message subject, body, CRM link, date, barber, service, and booking reference.
8. Open the protected integration status. It should move from `awaiting_activation` to `active` after a successful delivery.

Changing the recipient requires activation again. Never claim activation from configuration alone.
