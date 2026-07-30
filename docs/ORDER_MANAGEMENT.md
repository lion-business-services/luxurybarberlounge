# Order Management

Square is the financial source of truth. Supabase stores normalized mirrors and portal extensions, not invented balances.

## Client

A client may view only orders mapped to their verified Square customer identity, including total, state, deposit/payment references, refund state, receipt reference, and related membership or package context. Clients can open support cases but cannot change totals, payment state, discounts, tips, or refunds.

## Admin

Authorized staff may search and inspect synchronized orders, payments, refunds, reconciliation state, and support cases. Provider-owned financial values remain read-only. Corrections use Square, controlled mappings, or audited adjustment records.

## Failure states

When Square is disabled or a receipt is not synchronized, the interface says so explicitly. It never substitutes demo transactions or claims that a refund or payment succeeded before provider confirmation.
