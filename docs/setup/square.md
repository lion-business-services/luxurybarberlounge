# Square Setup

## Sandbox

1. Create a Square developer application.
2. Set `SQUARE_ENVIRONMENT=sandbox`.
3. Add sandbox application ID, access token, and location ID.
4. Map every published service to a Square catalog variation.
5. Map every active barber to a Square team member.
6. Configure booking profiles, availability, deposits, taxes, and cancellation rules in Square.
7. Register the webhook URL and copy the signature key.
8. Enable Square feature flags only after catalog, team, availability, booking, payment, refund, and duplicate-webhook tests pass.

## Production

Production activation requires a separate access token, location, webhook key, webhook URL, and explicit owner approval. Confirm that public prices, duration, deposit, taxes, and policies match Square exactly.

The website never stores raw card data and does not move commission funds.
