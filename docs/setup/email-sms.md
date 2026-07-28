# Email and SMS Setup

The repository includes development adapters that accept a message without sending it. Live delivery remains disabled until a provider is selected and configured.

## Email

- Configure provider key, approved sender domain, `EMAIL_FROM`, and reply-to address.
- Verify SPF, DKIM, and DMARC with the selected provider.
- Test English and Spanish transactional templates.
- Separate transactional and marketing classifications.

## SMS

- Configure Twilio or replace the adapter with the approved provider.
- Complete sender registration and applicable campaign requirements.
- Record explicit consent with policy version, source, and timestamp.
- Support STOP/HELP behavior and suppression lists.
- Apply quiet hours and duplicate suppression.

Never enable live marketing sends merely because credentials are present. The matching feature flag, consent checks, and test mode must also be approved.
