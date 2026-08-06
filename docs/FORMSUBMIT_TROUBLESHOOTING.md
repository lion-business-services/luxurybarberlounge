# FormSubmit Troubleshooting

- **Awaiting activation:** click the activation message sent to the recipient, then retry.
- **No activation message:** check Spam/Junk, verify the recipient can receive normal mail, and submit one controlled production test again.
- **Blank message:** confirm every submitted value has a field name. The server adapter already supplies named fields.
- **Origin problem:** the adapter sends `_url` with the canonical `/book` URL.
- **Provider timeout or HTTP failure:** the appointment remains saved; the retry cron applies backoff for up to eight attempts.
- **Repeated activation mail:** the form has not yet been confirmed.
- **Changed recipient:** activate the new address separately.
- **Delivery still missing:** inspect `formsubmit_deliveries`, Vercel logs, Spam/Junk, and the protected integration card. Use Resend operational fallback while investigating.
