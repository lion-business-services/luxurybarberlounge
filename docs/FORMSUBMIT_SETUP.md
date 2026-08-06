# FormSubmit Setup

FormSubmit is the requested secondary administrative booking notification channel. Supabase remains the booking source of truth.

## Environment

```env
FORMSUBMIT_ENABLED=true
FORMSUBMIT_RECIPIENT_EMAIL=info@theluxurybarberlounge.com
```

## Implementation

The server sends an AJAX `POST` to FormSubmit only after the appointment and CRM record are saved. The payload includes `_subject`, `_template=table`, `_captcha=false`, `_honey`, `_url`, the client reply email, and sanitized booking fields. Authentication tokens, secrets, card data, and internal notes are never sent.

The database records `configured`, `awaiting_activation`, `sent`, `failed`, `retrying`, and `disabled` states in `formsubmit_deliveries`. The protected admin integration endpoint is `/api/admin/integrations/booking`.

## Anti-spam

The public request is protected by shared validation, a honeypot, in-process throttling, durable Supabase throttling, field limits, and idempotency. FormSubmit is called from the server, so clients never submit directly to the provider endpoint.
