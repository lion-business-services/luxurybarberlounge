# Commission and Reconciliation Operations

The engine distinguishes service basis, add-ons, products, memberships, packages, discounts, taxes, tips, deposits, refunds, chargebacks, cancellation/no-show fees, processing fees, and manual adjustments.

Lifecycle:

1. Ingest canonical Square records.
2. Match booking, client, barber, location, and service.
3. Determine attribution.
4. Apply the effective rule version.
5. Produce provisional calculation.
6. Open barber review window.
7. Resolve disputes with explicit events and adjustments.
8. Lock settlement period.
9. Publish final statement.
10. Mark payment after the owner completes it through the approved business method.

The platform reports amounts owed. It is not payroll software and does not transfer funds unless a separately approved payout module is later activated.
